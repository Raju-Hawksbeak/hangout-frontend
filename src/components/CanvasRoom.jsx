import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_BASE_URL, DEFAULT_CANVAS_ID } from '../config';
import { LANGUAGES, TRANSLATIONS, getInitialLang } from '../i18n';
import DraggableElement from './DraggableElement';
import HelpBrochureModal from './HelpBrochureModal';

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
  const safeUser =
    user && user.id ? user : { id: token || 'member', username: user?.username || 'Member' };
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
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [showQaModal, setShowQaModal] = useState(false);
  const [qaText, setQaText] = useState('');

  const [showHelpModal, setShowHelpModal] = useState(
    () => !localStorage.getItem('thek_welcome_seen_v1')
  );

  const handleCloseHelpModal = () => {
    localStorage.setItem('thek_welcome_seen_v1', 'true');
    setShowHelpModal(false);
  };

  const activeTheme = ROOM_THEMES.find((r) => r.id === canvasId) || ROOM_THEMES[0];
  const fallbackRoom = {
    label: 'tHek Main',
    hint: 'Drop a Voice Wave, Stage Clip, Polaroid Photo, or Sticky Note!'
  };
  const activeRoomCopy =
    t.rooms?.[canvasId] || TRANSLATIONS.en.rooms?.['default-hangout'] || fallbackRoom;

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
      setStatusBanner('📲 tHek installed to your home screen!');
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
    setExpandedPhoto(null);
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
            setExpandedPhoto((prev) => (prev?.id === msg.element_id ? null : prev));
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
      audio.onended = () => {
        idx += 1;
        playNext();
      };
      audio.onerror = () => {
        idx += 1;
        playNext();
      };
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
    setStatusBanner(`🔗 Copied tHek invite link for ${code}!`);
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
      )}&am=${amt}&cu=INR&tn=${encodeURIComponent('tHek Creator Tip')}`;
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

  const handleTidyGrid = async () => {
    if (elements.length === 0) return;
    resetViewport();

    const marginX = isMobile ? 16 : isTablet ? 24 : 36;
    const marginY = pinnedElement ? 164 : 112;
    const cardHeight = 295;

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
      setExpandedPhoto((prev) => (prev?.id === elementId ? null : prev));
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

  const dockClearance = isMobile ? 156 : 114;

  const getSafeDropCoords = () => {
    const baseOffsetX = Math.max(0, -pan.x / zoom);
    const baseOffsetY = Math.max(0, -pan.y / zoom);
    const maxSpreadX = Math.max(20, Math.min(viewport.width - 340, 1200));
    const usableHeight = Math.max(180, viewport.height - dockClearance - 160);
    const maxSpreadY = Math.max(60, Math.min(usableHeight, 680));

    if (isMobile) {
      return {
        x: Math.floor(baseOffsetX + 14 + Math.random() * Math.max(10, viewport.width - 310)),
        y: Math.floor(baseOffsetY + 112 + Math.random() * Math.max(40, usableHeight - 120))
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
      setStatusBanner('❓ Listener Q&A dropped onto tHek!');
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
