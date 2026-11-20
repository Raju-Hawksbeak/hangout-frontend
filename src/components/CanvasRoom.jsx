import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_BASE_URL, DEFAULT_CANVAS_ID } from '../config';
import { extractWaveformPeaks } from '../audioUtils';
import { LANGUAGES, TRANSLATIONS, getInitialLang } from '../i18n';
import DraggableElement from './DraggableElement';

const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const TRUSTED_TIP_HOSTS = ['razorpay.me', 'buymeacoffee.com', 'ko-fi.com', 'paypal.me', 'patreon.com'];

const ROOM_THEMES = [
  { id: DEFAULT_CANVAS_ID, icon: '⚡', accent: '#00e676', dotColor: '#1e293b', bgColor: '#0b0e14' },
  { id: 'standup-stage', icon: '🎤', accent: '#fb7185', dotColor: '#31101b', bgColor: '#12090d' },
  { id: 'baul-jam', icon: '🎸', accent: '#fbbf24', dotColor: '#2d210b', bgColor: '#120e08' },
  { id: 'chill-lounge', icon: '🌙', accent: '#a78bfa', dotColor: '#22183a', bgColor: '#0d0a16' }
];

function isValidTipHandle(value) {
  if (!value) return true;
  if (UPI_PATTERN.test(value)) return true;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' && TRUSTED_TIP_HOSTS.some((h) => parsed.hostname.endsWith(h))) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function resolveStreamUrl(url) {
  if (!url) return '';
  if (url.includes('/canvases/media/stream/')) {
    const filePart = url.split('/canvases/media/stream/')[1];
    return `${API_BASE_URL}/canvases/media/stream/${filePart}`;
  }
  return url;
}

export default function CanvasRoom({ user, token, inviteCodes = [], onLogout }) {
  const [lang, setLang] = useState(getInitialLang);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [canvasId, setCanvasId] = useState(DEFAULT_CANVAS_ID);
  const [elements, setElements] = useState([]);
  const [locks, setLocks] = useState({});
  const [wsConnected, setWsConnected] = useState(false);

  // Spatial Pan & Zoom Viewport state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(1);

  // Live Room Presence state
  const [onlineCount, setOnlineCount] = useState(1);
  //const [onlineUsers, setOnlineUsers] = useState([user.username]);
  const safeUser = user || { id: 'guest', username: 'Member' };

  // Creator IP Protection Toggles (applied to next drop)
  const [isWipMode, setIsWipMode] = useState(false);
  const [streamOnlyMode, setStreamOnlyMode] = useState(true);
  const [activeIpTarget, setActiveIpTarget] = useState(null);

  const activeTheme = ROOM_THEMES.find((r) => r.id === canvasId) || ROOM_THEMES[0];
  const activeRoomCopy = t.rooms?.[canvasId] || TRANSLATIONS.en.rooms[DEFAULT_CANVAS_ID];

  // Voice recording & stacking state
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stackTarget, setStackTarget] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Sequential Thread Audio Player state
  const [playingThreadId, setPlayingThreadId] = useState(null);
  const threadAudioRef = useRef(null);

  // PWA Install Prompt state
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);

  // Modals state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');

  const [showStageModal, setShowStageModal] = useState(false);
  const [stageUrl, setStageUrl] = useState('');
  const [stageTitle, setStageTitle] = useState('');
  const [stageFile, setStageFile] = useState(null);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoCaption, setPhotoCaption] = useState('');

  // Creator Tip Jar & UPI Setup state
  const storageKey = `hangout_tip_handle_${user.id}`;
  const [myTipHandle, setMyTipHandle] = useState(() => localStorage.getItem(storageKey) || '');
  const [showTipSetup, setShowTipSetup] = useState(false);
  const [tipInput, setTipInput] = useState(myTipHandle);
  const [tipError, setTipError] = useState('');
  const [activeTipTarget, setActiveTipTarget] = useState(null);
  const [tipAmount, setTipAmount] = useState('50');

  const [showInvites, setShowInvites] = useState(false);
  const [statusBanner, setStatusBanner] = useState('');

  const socketRef = useRef(null);

  const changeLanguage = (code) => {
    setLang(code);
    localStorage.setItem('thek_lang', code);
  };

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredInstallPrompt(null);
      setStatusBanner('📲 Thek installed to your home screen!');
    }
  };

  const clampZoom = (val) => Math.min(1.5, Math.max(0.5, Number(val.toFixed(2))));

  const handleBoardPointerDown = (e) => {
    if (
      e.target.closest('[data-card="true"]') ||
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('select') ||
      e.target.closest('nav') ||
      e.target.closest('header')
    ) {
      return;
    }
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleBoardPointerMove = (e) => {
    if (!isPanningRef.current) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handleBoardPointerUp = () => {
    isPanningRef.current = false;
  };

  const handleBoardWheel = (e) => {
    if (e.target.closest('iframe')) return;
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((z) => clampZoom(z + delta));
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      isPanningRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / pinchStartDistRef.current;
      setZoom(clampZoom(pinchStartZoomRef.current * scale));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const resetViewport = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const loadElements = async (targetCanvasId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/canvases/${targetCanvasId}/elements`);
      if (res.ok) {
        const data = await res.json();
        setElements(data);
      } else {
        setElements([]);
      }
    } catch (err) {
      console.error('Failed to fetch canvas elements:', err);
      setElements([]);
    }
  };

  useEffect(() => {
    stopThreadPlayback();
    resetViewport();
    setElements([]);
    setLocks({});
    setStackTarget(null);
    setOnlineCount(1);
    setOnlineUsers([user.username]);
    loadElements(canvasId);

    const ws = new WebSocket(
      `${WS_BASE_URL}/canvases/ws/${canvasId}?username=${encodeURIComponent(user.username)}`
    );
    socketRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.canvas_id && msg.canvas_id !== canvasId) return;

        if (msg.type === 'ROOM_PRESENCE') {
          setOnlineCount(msg.online_count || 1);
          setOnlineUsers(msg.online_users || [user.username]);
        } else if (msg.type === 'NEW_ELEMENT' && msg.element) {
          setElements((prev) =>
            prev.some((el) => el.id === msg.element.id) ? prev : [...prev, msg.element]
          );
        } else if (msg.type === 'NEW_AUDIO_LAYER' && msg.element) {
          setElements((prev) =>
            prev.some((el) => el.id === msg.element.id) ? prev : [...prev, msg.element]
          );
        } else if (msg.type === 'ELEMENT_REACTED' && msg.element_id) {
          setElements((prev) =>
            prev.map((el) =>
              el.id === msg.element_id
                ? { ...el, media_meta: { ...(el.media_meta || {}), reactions: msg.reactions } }
                : el
            )
          );
        } else if (msg.type === 'ELEMENT_DELETED' && msg.element_id) {
          setElements((prev) => prev.filter((el) => el.id !== msg.element_id));
        } else if (msg.type === 'CREATOR_TIP_CHEER') {
          setStatusBanner(`👏 ${msg.from} opened a ₹${msg.amount} tip cheer for @${msg.to}!`);
        } else if (msg.type === 'ELEMENT_LOCKED') {
          setLocks((prev) => ({
            ...prev,
            [msg.element_id]: { locked_by: msg.locked_by, username: msg.username }
          }));
        } else if (msg.type === 'ELEMENT_MOVING') {
          setElements((prev) =>
            prev.map((el) =>
              el.id === msg.element_id ? { ...el, transform_data: msg.transform_data } : el
            )
          );
        } else if (msg.type === 'ELEMENT_RELEASED') {
          setLocks((prev) => {
            const copy = { ...prev };
            delete copy[msg.element_id];
            return copy;
          });
          if (msg.transform_data) {
            setElements((prev) =>
              prev.map((el) =>
                el.id === msg.element_id ? { ...el, transform_data: msg.transform_data } : el
              )
            );
          }
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [canvasId]);

  const stopThreadPlayback = () => {
    if (threadAudioRef.current) {
      threadAudioRef.current.pause();
      threadAudioRef.current = null;
    }
    setPlayingThreadId(null);
  };

  const handlePlayThread = (parentEl, replies) => {
    if (playingThreadId === parentEl.id) {
      stopThreadPlayback();
      return;
    }
    stopThreadPlayback();

    const queue = [parentEl, ...replies].filter((item) => item.media_url);
    if (queue.length === 0) return;

    setPlayingThreadId(parentEl.id);
    let idx = 0;

    const playNext = () => {
      if (idx >= queue.length) {
        setPlayingThreadId(null);
        threadAudioRef.current = null;
        return;
      }
      const currentClip = queue[idx];
      setStatusBanner(
        `🎧 Playing thread (${idx + 1}/${queue.length}): @${currentClip.media_meta?.author || 'Member'}`
      );
      const audio = new Audio(resolveStreamUrl(currentClip.media_url));
      threadAudioRef.current = audio;

      audio.onended = () => {
        idx += 1;
        playNext();
      };
      audio.onerror = () => {
        idx += 1;
        playNext();
      };
      audio.play().catch(() => {
        setPlayingThreadId(null);
      });
    };

    playNext();
  };

  const handleReactElement = async (elementId, emoji) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== elementId) return el;
        const currentReactions = el.media_meta?.reactions || {};
        return {
          ...el,
          media_meta: {
            ...(el.media_meta || {}),
            reactions: {
              ...currentReactions,
              [emoji]: (currentReactions[emoji] || 0) + 1
            }
          }
        };
      })
    );

    try {
      const res = await fetch(`${API_BASE_URL}/canvases/elements/${elementId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });
      if (res.ok) {
        const data = await res.json();
        setElements((prev) =>
          prev.map((el) =>
            el.id === elementId
              ? { ...el, media_meta: { ...(el.media_meta || {}), reactions: data.reactions } }
              : el
          )
        );
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleCopyInviteLink = (code) => {
    const shareUrl = `${window.location.origin}/?invite=${encodeURIComponent(code)}`;
    navigator.clipboard?.writeText(shareUrl);
    setStatusBanner(`🔗 Copied Thek invite link for ${code}!`);
  };

  const handleSaveTipSetup = (e) => {
    e.preventDefault();
    setTipError('');
    const cleaned = tipInput.trim();

    if (cleaned && !isValidTipHandle(cleaned)) {
      setTipError('Enter a valid UPI ID (e.g., name@okicici) or https://razorpay.me / buymeacoffee.com link.');
      return;
    }

    setMyTipHandle(cleaned);
    localStorage.setItem(storageKey, cleaned);
    setShowTipSetup(false);
    setStatusBanner(
      cleaned
        ? `Tip Jar active! New drops will include Tip button (${cleaned})`
        : 'Tip handle cleared.'
    );
  };

  const handleSendTip = () => {
    if (!activeTipTarget) return;
    const handle = activeTipTarget.media_meta?.tip_handle || '';
    const author = activeTipTarget.media_meta?.author || 'Creator';
    const amt = Math.max(1, Math.min(100000, Number(tipAmount) || 50));

    if (!isValidTipHandle(handle)) {
      setStatusBanner('Invalid creator payment handle.');
      setActiveTipTarget(null);
      return;
    }

    if (handle.startsWith('https://')) {
      window.open(handle, '_blank', 'noopener,noreferrer');
    } else if (handle.includes('@')) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(handle)}&pn=${encodeURIComponent(
        author
      )}&am=${amt}&cu=INR&tn=${encodeURIComponent('Thek Creator Tip')}`;
      navigator.clipboard?.writeText(handle);
      window.location.href = upiUrl;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'CREATOR_TIP_CHEER',
          canvas_id: canvasId,
          from: user.username,
          to: author,
          amount: amt
        })
      );
    }

    setStatusBanner(`💸 Complete ₹${amt} payment in your UPI app (Copied: ${handle})`);
    setActiveTipTarget(null);
  };

  const handleTidyGrid = async () => {
    if (elements.length === 0) return;

    resetViewport();
    const cardWidth = 300;
    const cardHeight = 285;
    const marginX = 24;
    const marginY = 114;
    const cols = Math.max(1, Math.floor((window.innerWidth - marginX * 2) / cardWidth));

    const arranged = elements.map((el, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const newTransform = {
        ...(el.transform_data || {}),
        x: marginX + col * cardWidth,
        y: marginY + row * cardHeight
      };

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'ELEMENT_RELEASED',
            canvas_id: canvasId,
            element_id: el.id,
            transform_data: newTransform
          })
        );
      }

      return { ...el, transform_data: newTransform };
    });

    setElements(arranged);
    setStatusBanner('Grid arranged & saved permanently!');

    Promise.all(
      arranged.map((item) =>
        fetch(`${API_BASE_URL}/canvases/elements/${item.id}/transform`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ transform_data: item.transform_data })
        }).catch(() => null)
      )
    );
  };

  const handleDeleteElement = async (elementId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/canvases/elements/${elementId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setStatusBanner(errData.detail || 'You can only delete your own cards.');
        return;
      }

      setElements((prev) => prev.filter((el) => el.id !== elementId));

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'ELEMENT_DELETED',
            canvas_id: canvasId,
            element_id: elementId
          })
        );
      }
    } catch (err) {
      setStatusBanner('Delete request failed.');
    }
  };

  const uploadFileToBackend = async (fileObj, fallbackName) => {
    const formData = new FormData();
    formData.append('file', fileObj, fileObj.name || fallbackName);

    const uploadRes = await fetch(`${API_BASE_URL}/canvases/media/upload-direct`, {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(uploadData.detail || 'Media upload failed');
    }
    return uploadData.media_url;
  };

  const persistCanvasElement = async (elementType, mediaUrl, mediaMeta) => {
    const baseOffsetX = Math.max(0, -pan.x / zoom);
    const baseOffsetY = Math.max(0, -pan.y / zoom);
    const randomX = Math.floor(baseOffsetX + 40 + Math.random() * Math.max(120, window.innerWidth - 320));
    const randomY = Math.floor(baseOffsetY + 115 + Math.random() * Math.max(160, window.innerHeight - 320));

    const payload = {
      canvas_id: canvasId,
      element_type: elementType,
      media_url: mediaUrl,
      media_meta: {
        ...mediaMeta,
        author: user.username,
        tip_handle: myTipHandle || null,
        is_wip: isWipMode,
        stream_only: streamOnlyMode,
        reactions: {}
      },
      transform_data: {
        x: randomX,
        y: randomY,
        scale: 1,
        rotation: 0,
        z_index: elements.length + 1
      }
    };

    const res = await fetch(`${API_BASE_URL}/canvases/elements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const saved = await res.json();
    if (!res.ok) {
      throw new Error(saved.detail || 'Failed to save element');
    }

    setElements((prev) => (prev.some((el) => el.id === saved.id) ? prev : [...prev, saved]));

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'NEW_ELEMENT',
          canvas_id: canvasId,
          element: saved
        })
      );
    }
  };

  const startRecording = async () => {
    if (isRecording || isUploading) return;
    setStatusBanner('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUploadAndDrop(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setStatusBanner('Microphone access denied. Please allow mic permission in browser.');
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleAudioUploadAndDrop = async (audioBlob) => {
    setIsUploading(true);
    try {
      const { peaks, duration } = await extractWaveformPeaks(audioBlob, 30);
      const media_url = await uploadFileToBackend(audioBlob, 'voice-drop.webm');

      const baseOffsetX = Math.max(0, -pan.x / zoom);
      const baseOffsetY = Math.max(0, -pan.y / zoom);
      let dropX = Math.floor(baseOffsetX + 40 + Math.random() * Math.max(120, window.innerWidth - 310));
      let dropY = Math.floor(baseOffsetY + 115 + Math.random() * Math.max(160, window.innerHeight - 300));

      if (stackTarget) {
        const existingReplies = elements.filter((el) => el.parent_element_id === stackTarget.id);
        const parentX = stackTarget.transform_data?.x ?? 60;
        const parentY = stackTarget.transform_data?.y ?? 120;
        dropX = Math.max(16, parentX + 18);
        dropY = parentY + 145 * (existingReplies.length + 1);
      }

      const payload = {
        canvas_id: canvasId,
        element_type: 'audio',
        media_url,
        media_meta: {
          peaks,
          duration,
          author: user.username,
          tip_handle: myTipHandle || null,
          is_wip: isWipMode,
          stream_only: streamOnlyMode,
          reply_to_author: stackTarget ? stackTarget.media_meta?.author || 'Member' : null,
          reactions: {}
        },
        transform_data: {
          x: dropX,
          y: dropY,
          scale: 1,
          rotation: 0,
          z_index: elements.length + 5,
          is_stacked: Boolean(stackTarget)
        },
        parent_element_id: stackTarget ? stackTarget.id : null
      };

      const endpoint = stackTarget
        ? `${API_BASE_URL}/canvases/elements/${stackTarget.id}/stack-audio`
        : `${API_BASE_URL}/canvases/elements`;

      const saveRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const savedElement = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(savedElement.detail || 'Failed to save voice drop');
      }

      setElements((prev) =>
        prev.some((el) => el.id === savedElement.id) ? prev : [...prev, savedElement]
      );

      if (!stackTarget && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'NEW_ELEMENT',
            canvas_id: canvasId,
            element: savedElement
          })
        );
      }

      setStatusBanner(
        stackTarget
          ? `↳ Layered reply snapped under @${stackTarget.media_meta?.author || 'Member'}!`
          : `🛡️ Dropped with ${savedElement.media_meta?.ip_proof?.short_hash || 'SHA-256 IP Proof'}!`
      );
      setStackTarget(null);
    } catch (err) {
      setStatusBanner(err.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await persistCanvasElement('text', null, { text: noteText.trim() });
      setNoteText('');
      setShowNoteModal(false);
    } catch (err) {
      setStatusBanner(err.message || 'Could not post note.');
    }
  };

  const handleAddStageClip = async (e) => {
    e.preventDefault();
    if (!stageUrl.trim() && !stageFile) return;

    setIsUploading(true);
    try {
      let finalVideoUrl = stageUrl.trim();
      if (stageFile) {
        finalVideoUrl = await uploadFileToBackend(stageFile, 'stage-clip.mp4');
      }

      await persistCanvasElement('video', finalVideoUrl, {
        title: stageTitle.trim() || 'Standup / Stage Set'
      });

      setStageUrl('');
      setStageTitle('');
      setStageFile(null);
      setShowStageModal(false);
      setStatusBanner('🛡️ Stage Clip dropped with SHA-256 IP Proof!');
    } catch (err) {
      setStatusBanner(err.message || 'Could not drop Stage Clip.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPhoto = async (e) => {
    e.preventDefault();
    if (!photoFile) return;

    setIsUploading(true);
    try {
      const uploadedPhotoUrl = await uploadFileToBackend(photoFile, 'polaroid.jpg');
      await persistCanvasElement('photo', uploadedPhotoUrl, {
        caption: photoCaption.trim() || 'Live Vibe'
      });

      setPhotoFile(null);
      setPhotoCaption('');
      setShowPhotoModal(false);
      setStatusBanner('Polaroid Photo pinned to Thek!');
    } catch (err) {
      setStatusBanner(err.message || 'Could not upload photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onPointerDown={handleBoardPointerDown}
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUp}
      onPointerCancel={handleBoardPointerUp}
      onWheel={handleBoardWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        ...styles.board,
        backgroundColor: activeTheme.bgColor,
        backgroundImage: `radial-gradient(${activeTheme.dotColor} 1px, transparent 1px)`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`
      }}
    >
      {/* Top Bar */}
      <header style={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: wsConnected ? activeTheme.accent : '#f59e0b'
            }}
          />
          <div>
            <div style={{ fontWeight: '900', fontSize: '14px', color: '#fff', letterSpacing: '-0.3px' }}>
              Thek{' '}
              <span
                onClick={() => setStatusBanner(`🟢 Online in ${activeRoomCopy.label}: ${onlineUsers.join(', ')}`)}
                style={{
                  fontWeight: '700',
                  fontSize: '10px',
                  color: activeTheme.accent,
                  background: 'rgba(255,255,255,0.08)',
                  padding: '2px 6px',
                  borderRadius: '999px',
                  cursor: 'pointer'
                }}
              >
                {onlineCount} {t.liveSuffix}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>@{user.username}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', overflowX: 'auto' }}>
          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => changeLanguage(e.target.value)}
            style={styles.langSelect}
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code} style={{ background: '#0b0e14', color: '#f8fafc' }}>
                🌐 {item.short}
              </option>
            ))}
          </select>

          {deferredInstallPrompt && (
            <button
              onClick={handleInstallPwa}
              style={{ ...styles.pillBtn, borderColor: '#00e676', color: '#00e676' }}
            >
              {t.installBtn}
            </button>
          )}
          <button
            onClick={() => {
              setTipInput(myTipHandle);
              setTipError('');
              setShowTipSetup(true);
            }}
            style={{
              ...styles.pillBtn,
              borderColor: myTipHandle ? '#f59e0b' : '#475569',
              color: myTipHandle ? '#fcd34d' : '#cbd5e1'
            }}
          >
            {myTipHandle ? t.tipOn : t.tipSetup}
          </button>
          <button onClick={handleTidyGrid} style={{ ...styles.pillBtn, borderColor: '#38bdf8', color: '#38bdf8' }}>
            {t.tidyBtn}
          </button>
          <button onClick={() => setShowInvites(!showInvites)} style={styles.pillBtn}>
            {t.invitesBtn} ({inviteCodes.length})
          </button>
          <button onClick={onLogout} style={{ ...styles.pillBtn, color: '#fca5a5' }}>
            {t.exitBtn}
          </button>
        </div>
      </header>

      {/* Multi-Room Channel Switcher Bar */}
      <nav style={styles.roomBar}>
        {ROOM_THEMES.map((room) => {
          const isActive = room.id === canvasId;
          const roomText = t.rooms?.[room.id] || TRANSLATIONS.en.rooms[room.id];
          return (
            <button
              key={room.id}
              onClick={() => {
                setCanvasId(room.id);
                setStatusBanner(`${room.icon} ${roomText.label}`);
              }}
              style={{
                ...styles.roomChip,
                borderColor: isActive ? room.accent : '#1e293b',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.7
