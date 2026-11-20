import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_BASE_URL, DEFAULT_CANVAS_ID } from '../config';
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

function getViewportTier(width) {
  if (width <= 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

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

function generateDefaultPeaks(count = 30) {
  return Array.from({ length: count }, (_, i) =>
    Math.round(25 + Math.abs(Math.sin(i * 0.7)) * 65)
  );
}

export default function CanvasRoom({ user, token, inviteCodes = [], onLogout }) {
  const safeUser = user && user.id ? user : { id: token || 'member', username: user?.username || 'Member' };
  const [lang, setLang] = useState(getInitialLang);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    tier: getViewportTier(window.innerWidth)
  }));

  useEffect(() => {
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        tier: getViewportTier(window.innerWidth)
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = viewport.tier === 'mobile';
  const isTablet = viewport.tier === 'tablet';

  const [canvasId, setCanvasId] = useState(DEFAULT_CANVAS_ID);
  const [elements, setElements] = useState([]);
  const [locks, setLocks] = useState({});
  const [wsConnected, setWsConnected] = useState(false);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(1);

  const [onlineCount, setOnlineCount] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState([safeUser.username]);

  const [isWipMode, setIsWipMode] = useState(false);
  const [streamOnlyMode, setStreamOnlyMode] = useState(true);
  const [activeIpTarget, setActiveIpTarget] = useState(null);

  const [pinnedElement, setPinnedElement] = useState(null);
  const [showQaModal, setShowQaModal] = useState(false);
  const [qaText, setQaText] = useState('');

  const activeTheme = ROOM_THEMES.find((r) => r.id === canvasId) || ROOM_THEMES[0];
  const fallbackRoom = { label: 'Thek Main', hint: 'Drop a Voice Wave, Stage Clip, Polaroid Photo, or Sticky Note!' };
  const activeRoomCopy = t.rooms?.[canvasId] || TRANSLATIONS.en.rooms?.['default-hangout'] || fallbackRoom;

  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stackTarget, setStackTarget] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordStartTimeRef = useRef(0);

  const [playingThreadId, setPlayingThreadId] = useState(null);
  const threadAudioRef = useRef(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');

  const [showStageModal, setShowStageModal] = useState(false);
  const [stageUrl, setStageUrl] = useState('');
  const [stageTitle, setStageTitle] = useState('');
  const [stageFile, setStageFile] = useState(null);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoCaption, setPhotoCaption] = useState('');

  const storageKey = `hangout_tip_handle_${safeUser.id}`;
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

  const clampZoom = (val) => Math.min(1.6, Math.max(0.45, Number(val.toFixed(2))));

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
    setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
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
        setElements(Array.isArray(data) ? data : []);
      } else {
        setElements([]);
      }
    } catch {
      setElements([]);
    }
  };

  useEffect(() => {
    stopThreadPlayback();
    resetViewport();
    setElements([]);
    setLocks({});
    setStackTarget(null);
    setPinnedElement(null);
    setOnlineCount(1);
    setOnlineUsers([safeUser.username]);
    loadElements(canvasId);

    let ws;
    try {
      ws = new WebSocket(
        `${WS_BASE_URL}/canvases/ws/${canvasId}?username=${encodeURIComponent(safeUser.username)}`
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
            setOnlineUsers(msg.online_users || [safeUser.username]);
          } else if ((msg.type === 'NEW_ELEMENT' || msg.type === 'NEW_AUDIO_LAYER') && msg.element) {
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
            setPinnedElement((prev) => (prev?.id === msg.element_id ? null : prev));
          } else if (msg.type === 'PIN_STAGE_CARD') {
            setPinnedElement(msg.element || null);
            if (msg.element) {
              setStatusBanner(`📌 Pinned on stage by @${msg.pinned_by || 'Host'}`);
            }
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
        } catch {}
      };
    } catch {}

    return () => {
      if (ws) ws.close();
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
      audio.onended = () => { idx += 1; playNext(); };
      audio.onerror = () => { idx += 1; playNext(); };
      audio.play().catch(() => setPlayingThreadId(null));
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
            reactions: { ...currentReactions, [emoji]: (currentReactions[emoji] || 0) + 1 }
          }
        };
      })
    );

    try {
      const res = await fetch(`${API_BASE_URL}/canvases/elements/${elementId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
    } catch {}
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
      setTipError('Enter a valid UPI ID (e.g., name@okicici) or trusted tip link.');
      return;
    }
    setMyTipHandle(cleaned);
    localStorage.setItem(storageKey, cleaned);
    setShowTipSetup(false);
    setStatusBanner(cleaned ? `Tip Jar active (${cleaned})` : 'Tip handle cleared.');
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
          from: safeUser.username,
          to: author,
          amount: amt
        })
      );
    }

    setStatusBanner(`💸 Complete ₹${amt} payment in your UPI app (Copied: ${handle})`);
    setActiveTipTarget(null);
  };

  // Multi-Tier Tidy Grid: 1 col (Phone), 2 cols (Tablet), 3-5 cols (Big Monitor)
  const handleTidyGrid = async () => {
    if (elements.length === 0) return;
    resetViewport();

    const marginX = isMobile ? 16 : isTablet ? 24 : 36;
    const marginY = pinnedElement ? 164 : 112;
    const cardHeight = 285;

    let cols = 1;
    let cardWidth = viewport.width - 32;

    if (isTablet) {
      cols = 2;
      cardWidth = Math.floor((viewport.width - marginX * 2) / 2);
    } else if (!isMobile) {
      cardWidth = 320;
      cols = Math.max(2, Math.min(5, Math.floor((viewport.width - marginX * 2) / cardWidth)));
    }

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
    setStatusBanner(`Arranged in ${cols}-column ${viewport.tier} grid!`);

    Promise.all(
      arranged.map((item) =>
        fetch(`${API_BASE_URL}/canvases/elements/${item.id}/transform`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ transform_data: item.transform_data })
        }).catch(() => null)
      )
    );
  };

  const handleDeleteElement = async (elementId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/canvases/elements/${elementId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setStatusBanner(errData.detail || 'You can only delete your own cards.');
        return;
      }
      setElements((prev) => prev.filter((el) => el.id !== elementId));
      setPinnedElement((prev) => (prev?.id === elementId ? null : prev));
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({ type: 'ELEMENT_DELETED', canvas_id: canvasId, element_id: elementId })
        );
      }
    } catch {
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
    if (!uploadRes.ok) throw new Error(uploadData.detail || 'Media upload failed');
    return uploadData.media_url;
  };

  const getSafeDropCoords = () => {
    const baseOffsetX = Math.max(0, -pan.x / zoom);
    const baseOffsetY = Math.max(0, -pan.y / zoom);
    const maxSpreadX = Math.max(40, Math.min(viewport.width - 340, 1200));
    const maxSpreadY = Math.max(120, Math.min(viewport.height - 320, 720));

    if (isMobile) {
      return {
        x: Math.floor(baseOffsetX + 18 + Math.random() * 24),
        y: Math.floor(baseOffsetY + 114 + Math.random() * 140)
      };
    }
    return {
      x: Math.floor(baseOffsetX + 48 + Math.random() * maxSpreadX),
      y: Math.floor(baseOffsetY + 118 + Math.random() * maxSpreadY)
    };
  };

  const persistCanvasElement = async (elementType, mediaUrl, mediaMeta) => {
    const { x: randomX, y: randomY } = getSafeDropCoords();

    const payload = {
      canvas_id: canvasId,
      element_type: elementType,
      media_url: mediaUrl,
      media_meta: {
        ...mediaMeta,
        author: safeUser.username,
        tip_handle: myTipHandle || null,
        is_wip: isWipMode,
        stream_only: streamOnlyMode,
        reactions: {}
      },
      transform_data: { x: randomX, y: randomY, scale: 1, rotation: 0, z_index: elements.length + 1 }
    };

    const res = await fetch(`${API_BASE_URL}/canvases/elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    const saved = await res.json();
    if (!res.ok) throw new Error(saved.detail || 'Failed to save element');

    setElements((prev) => (prev.some((el) => el.id === saved.id) ? prev : [...prev, saved]));
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ type: 'NEW_ELEMENT', canvas_id: canvasId, element: saved })
      );
    }
  };

  const handlePinElement = (targetEl) => {
    setPinnedElement(targetEl);
    if (targetEl) {
      setStatusBanner(`📌 Pinned @${targetEl.media_meta?.author || 'Member'}'s card to stage!`);
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'PIN_STAGE_CARD',
          canvas_id: canvasId,
          pinned_by: safeUser.username,
          element: targetEl
        })
      );
    }
  };

  const handleAddQa = async (e) => {
    e.preventDefault();
    if (!qaText.trim()) return;
    try {
      await persistCanvasElement('text', null, { text: qaText.trim(), is_qa: true });
      setQaText('');
      setShowQaModal(false);
      setStatusBanner('❓ Listener Q&A dropped onto Thek!');
    } catch (err) {
      setStatusBanner(err.message || 'Could not post question.');
    }
  };

  const startRecording = async () => {
    if (isRecording || isUploading) return;
    setStatusBanner('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recordStartTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const elapsedSec = Math.max(1, Math.round((Date.now() - recordStartTimeRef.current) / 1000));
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUploadAndDrop(audioBlob, elapsedSec);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setStatusBanner('Microphone access denied. Please allow mic permission in browser.');
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleAudioUploadAndDrop = async (audioBlob, durationSec = 5) => {
    setIsUploading(true);
    try {
      const peaks = generateDefaultPeaks(30);
      const media_url = await uploadFileToBackend(audioBlob, 'voice-drop.webm');

      let { x: dropX, y: dropY } = getSafeDropCoords();

      if (stackTarget) {
        const existingReplies = elements.filter((el) => el.parent_element_id === stackTarget.id);
        const parentX = stackTarget.transform_data?.x ?? 24;
        const parentY = stackTarget.transform_data?.y ?? 120;
        dropX = Math.max(12, parentX + 16);
        dropY = parentY + 145 * (existingReplies.length + 1);
      }

      const payload = {
        canvas_id: canvasId,
        element_type: 'audio',
        media_url,
        media_meta: {
          peaks,
          duration: durationSec,
          author: safeUser.username,
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const savedElement = await saveRes.json();
      if (!saveRes.ok) throw new Error(savedElement.detail || 'Failed to save voice drop');

      setElements((prev) =>
        prev.some((el) => el.id === savedElement.id) ? prev : [...prev, savedElement]
      );

      if (!stackTarget && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({ type: 'NEW_ELEMENT', canvas_id: canvasId, element: savedElement })
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

  const dockClearance = isMobile ? 156 : 114;

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
      {/* Adaptive Top Header */}
      <header style={{ ...styles.topBar, padding: isMobile ? '0 8px' : '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: wsConnected ? activeTheme.accent : '#f59e0b'
            }}
          />
          <div>
            <div style={{ fontWeight: '900', fontSize: isMobile ? '13.5px' : '15px', color: '#fff', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Thek</span>
              <span
                onClick={() => setStatusBanner(`🟢 Online in ${activeRoomCopy.label}: ${onlineUsers.join(', ')}`)}
                style={{
                  fontWeight: '700',
                  fontSize: '10px',
                  color: activeTheme.accent,
                  background: 'rgba(255,255,255,0.08)',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  cursor: 'pointer'
                }}
              >
                {onlineCount} {isMobile ? '' : t.liveSuffix}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>@{safeUser.username}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px', alignItems: 'center', overflowX: 'auto', paddingLeft: '8px' }}>
          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => changeLanguage(e.target.value)}
            style={styles.langSelect}
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code} style={{ background: '#0b0e14', color: '#f8fafc' }}>
                {isMobile ? item.short : `🌐 ${item.short}`}
              </option>
            ))}
          </select>

          {deferredInstallPrompt && (
            <button onClick={handleInstallPwa} style={{ ...styles.pillBtn, borderColor: '#00e676', color: '#00e676' }}>
              {isMobile ? '📲' : t.installBtn}
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
            {isMobile ? '💸' : myTipHandle ? t.tipOn : t.tipSetup}
          </button>
          <button onClick={handleTidyGrid} style={{ ...styles.pillBtn, borderColor: '#38bdf8', color: '#38bdf8' }}>
            {isMobile ? '⊞' : t.tidyBtn}
          </button>
          <button onClick={() => setShowInvites(!showInvites)} style={styles.pillBtn}>
            {isMobile ? `🔑${inviteCodes.length}` : `${t.invitesBtn} (${inviteCodes.length})`}
          </button>
          <button onClick={onLogout} style={{ ...styles.pillBtn, color: '#fca5a5' }}>
            {isMobile ? '✕' : t.exitBtn}
          </button>
        </div>
      </header>

      {/* Room Switcher Bar */}
      <nav style={{ ...styles.roomBar, padding: isMobile ? '0 10px' : '0 20px', justifyContent: isMobile ? 'flex-start' : 'center' }}>
        {ROOM_THEMES.map((room) => {
          const isActive = room.id === canvasId;
          const roomText = t.rooms?.[room.id] || TRANSLATIONS.en.rooms?.[room.id] || { label: room.id, hint: '' };
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
                background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.7)',
                color: isActive ? room.accent : '#94a3b8'
              }}
            >
              <span>{room.icon}</span>
              <span>{roomText.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Pinned Live Stage Banner */}
      {pinnedElement && (
        <div style={styles.pinnedBanner}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#fbbf24', letterSpacing: '0.4px' }}>
              📌 ON STAGE • @{pinnedElement.media_meta?.author || 'Member'}
            </div>
            <div style={{ fontSize: '12.5px', color: '#fff', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pinnedElement.media_meta?.text || pinnedElement.media_meta?.title || pinnedElement.media_meta?.caption || '🎙 Live Audio / Stage Spotlight'}
            </div>
          </div>
          <button type="button" onClick={() => handlePinElement(null)} style={styles.unpinBtn}>
            Unpin
          </button>
        </div>
      )}

      {/* Invite Drawer */}
      {showInvites && (
        <div style={styles.inviteDrawer}>
          <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#00e676' }}>
            Tap a code to copy Invite Link:
          </div>
          {inviteCodes.length > 0 ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {inviteCodes.map((code) => (
                <span key={code} onClick={() => handleCopyInviteLink(code)} style={styles.codeChip}>
                  {code} 🔗
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>No unused invite codes left.</div>
          )}
        </div>
      )}

      {/* Toast */}
      {statusBanner && (
        <div style={styles.toast} onClick={() => setStatusBanner('')}>
          {statusBanner}
        </div>
      )}

      {/* Stack Banner */}
      {stackTarget && (
        <div style={{ ...styles.stackBanner, bottom: `${dockClearance + 4}px` }}>
          <span>↳ Reply under <b>@{stackTarget.media_meta?.author || 'Member'}</b></span>
          <button
            onClick={() => setStackTarget(null)}
            style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Empty Hint */}
      {elements.length === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
            {activeTheme.icon} {activeRoomCopy.label} {t.quietSuffix}
          </div>
          <div style={{ fontSize: isMobile ? '12.5px' : '14px', color: '#64748b' }}>{activeRoomCopy.hint}</div>
        </div>
      )}

      {/* Spatial Canvas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {elements.map((el) => {
            const replies =
              el.element_type === 'audio' && !el.parent_element_id
                ? elements.filter((child) => child.parent_element_id === el.id)
                : [];

            return (
              <DraggableElement
                key={el.id}
                element={el}
                lockInfo={locks[el.id]}
                socketRef={socketRef}
                currentUser={safeUser}
                token={token}
                canvasId={canvasId}
                zoom={zoom}
                threadReplies={replies}
                isPlayingThread={playingThreadId === el.id}
                onPlayThread={handlePlayThread}
                onDelete={() => handleDeleteElement(el.id)}
                onOpenTip={(targetEl) => setActiveTipTarget(targetEl)}
                onInspectIp={(targetEl) => setActiveIpTarget(targetEl)}
                onPinCard={handlePinElement}
                onReact={handleReactElement}
                onStackAudio={(targetEl) => {
                  const rootParent = targetEl.parent_element_id
                    ? elements.find((p) => p.id === targetEl.parent_element_id) || targetEl
                    : targetEl;
                  setStackTarget(rootParent);
                  setStatusBanner(
                    `Hold "${t.layerSoundBtn}" below to snap your reply under @${rootParent.media_meta?.author || 'Member'}!`
                  );
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Floating Zoom Controls */}
      <div style={{ ...styles.zoomControls, bottom: `${dockClearance}px`, right: isMobile ? '10px' : '22px' }}>
        <button type="button" onClick={() => setZoom((z) => clampZoom(z - 0.15))} style={styles.zoomBtn}>−</button>
        <button type="button" onClick={resetViewport} style={{ ...styles.zoomBtn, fontSize: '10.5px', padding: '4px 7px' }}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={() => setZoom((z) => clampZoom(z + 0.15))} style={styles.zoomBtn}>+</button>
      </div>

      {/* Modals */}
      {activeIpTarget && (
        <div style={styles.modalBackdrop} onClick={() => setActiveIpTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px', color: '#00e676' }}>
              🛡️ Proof of Creation Certificate
            </div>
            <div style={styles.certBox}>
              <div><b>Creator:</b> @{activeIpTarget.media_meta?.author}</div>
              <div><b>UTC Timestamp:</b> {activeIpTarget.media_meta?.ip_proof?.timestamp_utc}</div>
              <div><b>Status:</b> {activeIpTarget.media_meta?.is_wip ? '🚧 WIP (Draft)' : '✅ Original Release'}</div>
              <div style={{ marginTop: '6px', wordBreak: 'break-all', color: '#7dd3fc', fontSize: '10px' }}>
                <b>SHA-256:</b> {activeIpTarget.media_meta?.ip_proof?.sha256}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  const p = activeIpTarget.media_meta?.ip_proof;
                  navigator.clipboard?.writeText(`Thek IP Proof | @${activeIpTarget.media_meta?.author} | ${p?.timestamp_utc} | ${p?.sha256}`);
                  setStatusBanner('📋 Copied SHA-256 IP Certificate!');
                  setActiveIpTarget(null);
                }}
                style={styles.primaryMiniBtn}
              >
                Copy Proof
              </button>
              <button type="button" onClick={() => setActiveIpTarget(null)} style={styles.pillBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showTipSetup && (
        <div style={styles.modalBackdrop} onClick={() => setShowTipSetup(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSaveTipSetup} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '8px', color: '#fcd34d' }}>
              💸 Creator Tip Jar Setup (0% Fee)
            </div>
            <input
              type="text"
              placeholder="yourname@upi"
              value={tipInput}
              onChange={(e) => setTipInput(e.target.value)}
              autoFocus
              style={styles.noteInput}
            />
            {tipError && <div style={{ fontSize: '11px', color: '#f87171', marginTop: '6px' }}>{tipError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowTipSetup(false)} style={styles.pillBtn}>Cancel</button>
              <button type="submit" style={{ ...styles.primaryMiniBtn, background: '#f59e0b', color: '#1e1b04' }}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTipTarget && (
        <div style={styles.modalBackdrop} onClick={() => setActiveTipTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '8px', color: '#fcd34d' }}>
              💸 Tip @{activeTipTarget.media_meta?.author || 'Creator'}
            </div>
            <input
              type="number"
              min="1"
              max="100000"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              style={{ ...styles.noteInput, marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setActiveTipTarget(null)} style={styles.pillBtn}>Close</button>
              <button type="button" onClick={handleSendTip} style={{ ...styles.primaryMiniBtn, background: '#f59e0b', color: '#1e1b04' }}>
                Pay ₹{tipAmount || '50'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQaModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowQaModal(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleAddQa} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '8px', color: '#fbbf24' }}>
              ❓ Ask the Host / Podcaster
            </div>
            <input
              type="text"
              placeholder="Type your live question or topic request..."
              value={qaText}
              onChange={(e) => setQaText(e.target.value)}
              maxLength={160}
              autoFocus
              style={styles.noteInput}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowQaModal(false)} style={styles.pillBtn}>Cancel</button>
              <button type="submit" style={{ ...styles.primaryMiniBtn, background: '#fbbf24', color: '#1e1b04' }}>
                Drop Q&A
              </button>
            </div>
          </form>
        </div>
      )}

      {showNoteModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowNoteModal(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleAddNote} style={styles.noteModal}>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px', color: '#fff' }}>
              {activeRoomCopy.label}
            </div>
            <input
              type="text"
              placeholder="Write a vibe, lyric, or punchline..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              maxLength={140}
              autoFocus
              style={styles.noteInput}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowNoteModal(false)} style={styles.pillBtn}>Cancel</button>
              <button type="submit" style={styles.primaryMiniBtn}>Post</button>
            </div>
          </form>
        </div>
      )}

      {showStageModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowStageModal(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleAddStageClip} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '10px', color: '#fb7185' }}>
              🎬 Drop a Stage Clip
            </div>
            <input
              type="text"
              placeholder="Clip title"
              value={stageTitle}
              onChange={(e) => setStageTitle(e.target.value)}
              maxLength={80}
              style={{ ...styles.noteInput, marginBottom: '10px' }}
            />
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=... or youtu.be/..."
              value={stageUrl}
              onChange={(e) => {
                setStageUrl(e.target.value);
                if (e.target.value) setStageFile(null);
              }}
              style={{ ...styles.noteInput, marginBottom: '10px' }}
            />
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setStageFile(file);
                if (file) setStageUrl('');
              }}
              style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '12px', width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowStageModal(false)} style={styles.pillBtn}>Cancel</button>
              <button
                type="submit"
                disabled={isUploading || (!stageUrl.trim() && !stageFile)}
                style={{ ...styles.primaryMiniBtn, background: '#fb7185', color: '#fff' }}
              >
                {isUploading ? t.uploadingBtn : 'Drop Clip'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showPhotoModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowPhotoModal(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleAddPhoto} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '10px', color: '#38bdf8' }}>
              📸 Pin a Polaroid Photo
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              required
              style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px', width: '100%' }}
            />
            <input
              type="text"
              placeholder="Write a short Polaroid caption..."
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              maxLength={60}
              style={{ ...styles.noteInput, marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowPhotoModal(false)} style={styles.pillBtn}>Cancel</button>
              <button
                type="submit"
                disabled={isUploading || !photoFile}
                style={{ ...styles.primaryMiniBtn, background: '#38bdf8', color: '#082f49' }}
              >
                {isUploading ? t.uploadingBtn : 'Pin Photo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Creator IP Protection Quick-Toggle Strip */}
      <div style={{ ...styles.ipStrip, bottom: isMobile ? '118px' : '76px' }}>
        <button
          type="button"
          onClick={() => setIsWipMode(!isWipMode)}
          style={{
            ...styles.ipChip,
            borderColor: isWipMode ? '#eab308' : '#334155',
            color: isWipMode ? '#fde047' : '#94a3b8'
          }}
        >
          🚧 WIP: {isWipMode ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={() => setStreamOnlyMode(!streamOnlyMode)}
          style={{
            ...styles.ipChip,
            borderColor: streamOnlyMode ? '#00e676' : '#334155',
            color: streamOnlyMode ? '#6ee7b7' : '#94a3b8'
          }}
        >
          {streamOnlyMode ? '🔒 Stream-Only' : '⬇ Downloadable'}
        </button>
      </div>

      {/* Multi-Device Bottom Dock (2-Row on Mobile, Single Centered Pill on Tablet & Big Monitor) */}
      <div style={isMobile ? styles.mobileDock : styles.bottomDock}>
        <div style={isMobile ? styles.mobileActionRow : styles.desktopActionRow}>
          <button onClick={() => setShowNoteModal(true)} style={isMobile ? styles.mobileMiniBtn : styles.noteBtn}>
            {isMobile ? '📝 Note' : t.noteBtn}
          </button>
          <button onClick={() => setShowQaModal(true)} style={isMobile ? { ...styles.mobileMiniBtn, borderColor: '#fbbf24', color: '#fde047' } : { ...styles.noteBtn, borderColor: '#fbbf24', color: '#fde047' }}>
            ❓ Q&A
          </button>
          <button onClick={() => setShowStageModal(true)} style={isMobile ? { ...styles.mobileMiniBtn, borderColor: '#fb7185', color: '#fda4af' } : { ...styles.noteBtn, borderColor: '#fb7185', color: '#fda4af' }}>
            {isMobile ? '🎬 Clip' : t.stageBtn}
          </button>
          <button onClick={() => setShowPhotoModal(true)} style={isMobile ? { ...styles.mobileMiniBtn, borderColor: '#38bdf8', color: '#7dd3fc' } : { ...styles.noteBtn, borderColor: '#38bdf8', color: '#7dd3fc' }}>
            {isMobile ? '📸 Photo' : t.photoBtn}
          </button>
        </div>

        <button
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          disabled={isUploading}
          className={isRecording ? 'recording-pulse' : ''}
          style={{
            ...(isMobile ? styles.mobileVoiceBtn : styles.voiceBtn),
            background: isRecording ? '#ff1744' : isUploading ? '#475569' : activeTheme.accent,
            color: isRecording ? '#ffffff' : '#051b11'
          }}
        >
          {isUploading ? t.uploadingBtn : isRecording ? t.releaseDropBtn : stackTarget ? t.layerSoundBtn : t.voiceDropBtn}
        </button>
      </div>
    </div>
  );
}

const styles = {
  board: { position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', touchAction: 'none', cursor: 'grab', transition: 'background-color 0.25s ease' },
  topBar: { position: 'fixed', top: 0, left: 0, right: 0, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(11, 14, 20, 0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e293b', zIndex: 55 },
  langSelect: { background: '#0b0e14', border: '1px solid #334155', color: '#00e676', fontSize: '10.5px', fontWeight: '700', padding: '5px 7px', borderRadius: '999px', outline: 'none', cursor: 'pointer' },
  roomBar: { position: 'fixed', top: '54px', left: 0, right: 0, height: '42px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(11, 14, 20, 0.78)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(30, 41, 59, 0.6)', overflowX: 'auto', zIndex: 50 },
  roomChip: { display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #1e293b', fontSize: '11.5px', fontWeight: '700', padding: '5px 12px', borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap' },
  pinnedBanner: { position: 'fixed', top: '102px', left: '50%', transform: 'translateX(-50%)', width: 'min(520px, 92vw)', background: 'linear-gradient(90deg, rgba(30, 27, 75, 0.96), rgba(49, 16, 47, 0.96))', border: '1.5px solid #fbbf24', borderRadius: '14px', padding: '9px 14px', zIndex: 65, boxShadow: '0 10px 28px rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' },
  unpinBtn: { background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fde047', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' },
  pillBtn: { background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', fontSize: '11px', fontWeight: '700', padding: '5px 10px', borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap' },
  zoomControls: { position: 'fixed', display: 'flex', alignItems: 'center', background: 'rgba(19, 24, 34, 0.92)', border: '1px solid #334155', borderRadius: '999px', padding: '3px', zIndex: 45 },
  zoomBtn: { background: 'transparent', border: 'none', color: '#cbd5e1', fontWeight: '800', fontSize: '14px', padding: '3px 9px', cursor: 'pointer' },
  inviteDrawer: { position: 'fixed', top: '102px', right: '16px', width: 'min(360px, 90vw)', background: '#131822', border: '1px solid #2d3748', borderRadius: '14px', padding: '12px 14px', zIndex: 60, boxShadow: '0 12px 30px rgba(0,0,0,0.6)' },
  codeChip: { background: '#0b0e14', border: '1px dashed #00e676', color: '#00e676', fontSize: '12px', fontWeight: '700', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer' },
  toast: { position: 'fixed', top: '158px', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', border: '1px solid #38bdf8', color: '#f8fafc', fontSize: '12px', padding: '6px 16px', borderRadius: '999px', zIndex: 70, cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: '92vw', overflow: 'hidden', textOverflow: 'ellipsis' },
  stackBanner: { position: 'fixed', left: '50%', transform: 'translateX(-50%)', background: '#0284c7', color: '#fff', fontSize: '12px', padding: '6px 14px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 60, whiteSpace: 'nowrap' },
  emptyState: { position: 'absolute', top: '48%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', padding: '20px', width: 'min(380px, 88vw)', pointerEvents: 'none' },
  ipStrip: { position: 'fixed', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 50 },
  ipChip: { background: 'rgba(11, 14, 20, 0.9)', border: '1px solid #334155', fontSize: '10.5px', fontWeight: '700', padding: '4px 11px', borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap' },
  bottomDock: { position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(19, 24, 34, 0.94)', backdropFilter: 'blur(14px)', padding: '9px 14px', borderRadius: '999px', border: '1px solid #2d3748', boxShadow: '0 14px 35px rgba(0,0,0,0.7)', zIndex: 50 },
  desktopActionRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  mobileDock: { position: 'fixed', bottom: '10px', left: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '7px', background: 'rgba(19, 24, 34, 0.95)', backdropFilter: 'blur(14px)', padding: '9px 10px', borderRadius: '18px', border: '1px solid #2d3748', boxShadow: '0 14px 35px rgba(0,0,0,0.75)', zIndex: 50 },
  mobileActionRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' },
  mobileMiniBtn: { background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontWeight: '700', fontSize: '11px', padding: '8px 4px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap' },
  mobileVoiceBtn: { width: '100%', border: 'none', fontWeight: '800', fontSize: '13px', padding: '12px 16px', borderRadius: '12px', cursor: 'pointer', userSelect: 'none', touchAction: 'none', textAlign: 'center' },
  noteBtn: { background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontWeight: '700', fontSize: '12.5px', padding: '10px 14px', borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap' },
  voiceBtn: { border: 'none', fontWeight: '800', fontSize: '12.5px', padding: '10px 20px', borderRadius: '999px', cursor: 'pointer', userSelect: 'none', touchAction: 'none', whiteSpace: 'nowrap' },
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '16px' },
  noteModal: { width: '100%', maxWidth: '380px', background: '#131822', border: '1px solid #2d3748', borderRadius: '16px', padding: '20px' },
  certBox: { background: '#0b0e14', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 12px', fontSize: '11.5px', color: '#e2e8f0', lineHeight: '1.6' },
  noteInput: { width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid #334155', background: '#0b0e14', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  primaryMiniBtn: { background: '#00e676', border: 'none', color: '#051b11', fontWeight: '800', fontSize: '12px', padding: '7px 14px', borderRadius: '999px', cursor: 'pointer' }
};
