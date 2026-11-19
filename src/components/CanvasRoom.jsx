import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_BASE_URL, DEFAULT_CANVAS_ID } from '../config';
import { extractWaveformPeaks } from '../audioUtils';
import DraggableElement from './DraggableElement';

const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const TRUSTED_TIP_HOSTS = ['razorpay.me', 'buymeacoffee.com', 'ko-fi.com', 'paypal.me', 'patreon.com'];

const ROOMS = [
  {
    id: DEFAULT_CANVAS_ID,
    label: 'Live Jam',
    icon: '⚡',
    accent: '#00e676',
    dotColor: '#1e293b',
    bgColor: '#0b0e14',
    hint: 'Drop a Voice Wave, Stage Clip, Polaroid Photo, or Sticky Note!'
  },
  {
    id: 'standup-stage',
    label: 'Standup Stage',
    icon: '🎤',
    accent: '#fb7185',
    dotColor: '#31101b',
    bgColor: '#12090d',
    hint: 'Drop your 1-min standup bits, crowd-work clips, or punchline notes!'
  },
  {
    id: 'baul-jam',
    label: 'Baul & Folk Jam',
    icon: '🎸',
    accent: '#fbbf24',
    dotColor: '#2d210b',
    bgColor: '#120e08',
    hint: 'Drop an acoustic riff or vocal alaap, then hit + Layer Sound to jam together!'
  },
  {
    id: 'chill-lounge',
    label: 'Chill Lounge',
    icon: '🌙',
    accent: '#a78bfa',
    dotColor: '#22183a',
    bgColor: '#0d0a16',
    hint: 'Late-night adda, poetry drops, and raw backstage Polaroids.'
  }
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

export default function CanvasRoom({ user, token, inviteCodes = [], onLogout }) {
  const [canvasId, setCanvasId] = useState(DEFAULT_CANVAS_ID);
  const [elements, setElements] = useState([]);
  const [locks, setLocks] = useState({});
  const [wsConnected, setWsConnected] = useState(false);

  const activeRoom = ROOMS.find((r) => r.id === canvasId) || ROOMS[0];

  // Voice recording & stacking state
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stackTarget, setStackTarget] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
    setElements([]);
    setLocks({});
    setStackTarget(null);
    loadElements(canvasId);

    const ws = new WebSocket(`${WS_BASE_URL}/canvases/ws/${canvasId}`);
    socketRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.canvas_id && msg.canvas_id !== canvasId) return;

        if (msg.type === 'NEW_ELEMENT' && msg.element) {
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

  // React with Emoji on any card (Optimistic UI + Backend Sync)
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

  // Copy One-Click Shareable Invite Link
  const handleCopyInviteLink = (code) => {
    const shareUrl = `${window.location.origin}/?invite=${encodeURIComponent(code)}`;
    navigator.clipboard?.writeText(shareUrl);
    setStatusBanner(`🔗 Copied invite link for ${code}! Send it to your friend.`);
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
      )}&am=${amt}&cu=INR&tn=${encodeURIComponent('Hangout Creator Tip')}`;
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

  const handleTidyGrid = () => {
    if (elements.length === 0) return;

    const cardWidth = 300;
    const cardHeight = 265;
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
    setStatusBanner('Canvas arranged into clean grid!');
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
    const randomX = Math.floor(40 + Math.random() * Math.max(120, window.innerWidth - 320));
    const randomY = Math.floor(115 + Math.random() * Math.max(160, window.innerHeight - 320));

    const payload = {
      canvas_id: canvasId,
      element_type: elementType,
      media_url: mediaUrl,
      media_meta: {
        ...mediaMeta,
        author: user.username,
        tip_handle: myTipHandle || null,
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

      const randomX = Math.floor(40 + Math.random() * Math.max(120, window.innerWidth - 310));
      const randomY = Math.floor(115 + Math.random() * Math.max(160, window.innerHeight - 300));

      const payload = {
        canvas_id: canvasId,
        element_type: 'audio',
        media_url,
        media_meta: {
          peaks,
          duration,
          author: user.username,
          tip_handle: myTipHandle || null,
          reactions: {}
        },
        transform_data: {
          x: randomX,
          y: randomY,
          scale: 1,
          rotation: 0,
          z_index: elements.length + 1
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
      setStatusBanner('Stage Clip dropped onto canvas!');
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
      setStatusBanner('Polaroid Photo pinned to canvas!');
    } catch (err) {
      setStatusBanner(err.message || 'Could not upload photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        ...styles.board,
        backgroundColor: activeRoom.bgColor,
        backgroundImage: `radial-gradient(${activeRoom.dotColor} 1px, transparent 1px)`
      }}
    >
      {/* Top Bar */}
      <header style={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: wsConnected ? activeRoom.accent : '#f59e0b'
            }}
          />
          <div>
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#fff' }}>
              {activeRoom.icon} {activeRoom.label}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>@{user.username}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
            💸 {myTipHandle ? 'Tip On' : 'Tip Setup'}
          </button>
          <button onClick={handleTidyGrid} style={{ ...styles.pillBtn, borderColor: '#38bdf8', color: '#38bdf8' }}>
            Tidy
          </button>
          <button onClick={() => setShowInvites(!showInvites)} style={styles.pillBtn}>
            Invites ({inviteCodes.length})
          </button>
          <button onClick={onLogout} style={{ ...styles.pillBtn, color: '#fca5a5' }}>
            Exit
          </button>
        </div>
      </header>

      {/* Multi-Room Channel Switcher Bar */}
      <nav style={styles.roomBar}>
        {ROOMS.map((room) => {
          const isActive = room.id === canvasId;
          return (
            <button
              key={room.id}
              onClick={() => {
                setCanvasId(room.id);
                setStatusBanner(`Switched to ${room.icon} ${room.label}`);
              }}
              style={{
                ...styles.roomChip,
                borderColor: isActive ? room.accent : '#1e293b',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.7)',
                color: isActive ? room.accent : '#94a3b8'
              }}
            >
              <span>{room.icon}</span>
              <span>{room.label}</span>
            </button>
          );
        })}
      </nav>

      {/* One-Click Invite Link Drawer */}
      {showInvites && (
        <div style={styles.inviteDrawer}>
          <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#00e676' }}>
            Tap a code to copy One-Click Invite Link:
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px' }}>
            Auto-fills invite code when your friend opens the link!
          </div>
          {inviteCodes.length > 0 ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {inviteCodes.map((code) => (
                <span
                  key={code}
                  onClick={() => handleCopyInviteLink(code)}
                  style={styles.codeChip}
                >
                  {code} 🔗
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Invite codes are issued upon new account registration.
            </div>
          )}
        </div>
      )}

      {/* Status Toast */}
      {statusBanner && (
        <div style={styles.toast} onClick={() => setStatusBanner('')}>
          {statusBanner}
        </div>
      )}

      {/* Stacking Indicator */}
      {stackTarget && (
        <div style={styles.stackBanner}>
          <span>Layering sound under <b>{stackTarget.media_meta?.author || 'Voice Drop'}</b></span>
          <button
            onClick={() => setStackTarget(null)}
            style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Canvas Elements */}
      {elements.length === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
            {activeRoom.icon} {activeRoom.label} is Quiet...
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>{activeRoom.hint}</div>
        </div>
      )}

      {elements.map((el) => (
        <DraggableElement
          key={el.id}
          element={el}
          lockInfo={locks[el.id]}
          socketRef={socketRef}
          currentUser={user}
          canvasId={canvasId}
          onDelete={() => handleDeleteElement(el.id)}
          onOpenTip={(targetEl) => setActiveTipTarget(targetEl)}
          onReact={handleReactElement}
          onStackAudio={(targetEl) => {
            setStackTarget(targetEl);
            setStatusBanner('Hold the Voice Drop button below to record your layered reply!');
          }}
        />
      ))}

      {/* Creator Tip Setup Modal */}
      {showTipSetup && (
        <div style={styles.modalBackdrop} onClick={() => setShowTipSetup(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSaveTipSetup} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px', color: '#fcd34d' }}>
              💸 Creator Tip Jar Setup (0% Fee)
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
              Enter your verified UPI ID (e.g., <b>name@okicici</b>) or trusted tip link.
            </div>
            <input
              type="text"
              placeholder="yourname@upi"
              value={tipInput}
              onChange={(e) => setTipInput(e.target.value)}
              autoFocus
              style={styles.noteInput}
            />
            {tipError && (
              <div style={{ fontSize: '11px', color: '#f87171', marginTop: '6px' }}>{tipError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowTipSetup(false)} style={styles.pillBtn}>
                Cancel
              </button>
              <button
                type="submit"
                style={{ ...styles.primaryMiniBtn, background: '#f59e0b', color: '#1e1b04' }}
              >
                Save Tip Handle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fan Tip Payment Modal */}
      {activeTipTarget && (
        <div style={styles.modalBackdrop} onClick={() => setActiveTipTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px', color: '#fcd34d' }}>
              💸 Tip @{activeTipTarget.media_meta?.author || 'Creator'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
              Direct P2P to <b>{activeTipTarget.media_meta?.tip_handle}</b> (Verify recipient name in your UPI app)
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {['20', '50', '100', '250'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTipAmount(amt)}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    borderRadius: '8px',
                    border: tipAmount === amt ? '1px solid #f59e0b' : '1px solid #334155',
                    background: tipAmount === amt ? 'rgba(245, 158, 11, 0.2)' : '#0b0e14',
                    color: '#fcd34d',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <input
              type="number"
              min="1"
              max="100000"
              placeholder="Custom amount (INR)"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              style={{ ...styles.noteInput, marginBottom: '12px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setActiveTipTarget(null)} style={styles.pillBtn}>
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTip}
                style={{ ...styles.primaryMiniBtn, background: '#f59e0b', color: '#1e1b04' }}
              >
                Pay ₹{tipAmount || '50'} Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Note Modal */}
      {showNoteModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowNoteModal(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleAddNote} style={styles.noteModal}>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px', color: '#fff' }}>
              Drop a Sticky Note in {activeRoom.label}
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
              <button type="button" onClick={() => setShowNoteModal(false)} style={styles.pillBtn}>
                Cancel
              </button>
              <button type="submit" style={styles.primaryMiniBtn}>
                Post Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stage Clip Modal */}
      {showStageModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowStageModal(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleAddStageClip} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px', color: '#fb7185' }}>
              🎬 Drop a Stage Clip
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
              Paste a YouTube / Shorts link OR upload a short clip (max 20 MB)
            </div>

            <input
              type="text"
              placeholder="Clip title (e.g., Sodepur Open Mic Bit)"
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

            <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginBottom: '8px' }}>
              — OR UPLOAD SHORT VIDEO —
            </div>

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
              <button type="button" onClick={() => setShowStageModal(false)} style={styles.pillBtn}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || (!stageUrl.trim() && !stageFile)}
                style={{ ...styles.primaryMiniBtn, background: '#fb7185', color: '#fff' }}
              >
                {isUploading ? 'Dropping...' : 'Drop Clip'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Polaroid Photo Modal */}
      {showPhotoModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowPhotoModal(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleAddPhoto} style={styles.noteModal}>
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px', color: '#38bdf8' }}>
              📸 Pin a Polaroid Photo
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
              Share a raw backstage moment, gig snapshot, or doodle
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
              <button type="button" onClick={() => setShowPhotoModal(false)} style={styles.pillBtn}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !photoFile}
                style={{ ...styles.primaryMiniBtn, background: '#38bdf8', color: '#082f49' }}
              >
                {isUploading ? 'Pinning...' : 'Pin Photo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom Floating Dock */}
      <div style={styles.bottomDock}>
        <button onClick={() => setShowNoteModal(true)} style={styles.noteBtn}>
          + Note
        </button>

        <button
          onClick={() => setShowStageModal(true)}
          style={{ ...styles.noteBtn, borderColor: '#fb7185', color: '#fda4af' }}
        >
          🎬 Stage
        </button>

        <button
          onClick={() => setShowPhotoModal(true)}
          style={{ ...styles.noteBtn, borderColor: '#38bdf8', color: '#7dd3fc' }}
        >
          📸 Photo
        </button>

        <button
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          disabled={isUploading}
          className={isRecording ? 'recording-pulse' : ''}
          style={{
            ...styles.voiceBtn,
            background: isRecording ? '#ff1744' : isUploading ? '#475569' : activeRoom.accent,
            color: isRecording ? '#ffffff' : '#051b11'
          }}
        >
          {isUploading
            ? 'Uploading...'
            : isRecording
            ? '● Release to Drop'
            : stackTarget
            ? '🎙 Layer Sound'
            : '🎙 Voice Drop'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  board: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundSize: '24px 24px',
    transition: 'background-color 0.25s ease'
  },
  topBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '54px',
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(11, 14, 20, 0.88)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #1e293b',
    zIndex: 55
  },
  roomBar: {
    position: 'fixed',
    top: '54px',
    left: 0,
    right: 0,
    height: '42px',
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(11, 14, 20, 0.72)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(30, 41, 59, 0.6)',
    overflowX: 'auto',
    zIndex: 50
  },
  roomChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    border: '1px solid #1e293b',
    fontSize: '11px',
    fontWeight: '700',
    padding: '5px 11px',
    borderRadius: '999px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  pillBtn: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#e2e8f0',
    fontSize: '11px',
    fontWeight: '600',
    padding: '6px 10px',
    borderRadius: '999px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  inviteDrawer: {
    position: 'fixed',
    top: '102px',
    right: '16px',
    background: '#131822',
    border: '1px solid #2d3748',
    borderRadius: '14px',
    padding: '12px 14px',
    zIndex: 60,
    boxShadow: '0 12px 30px rgba(0,0,0,0.6)'
  },
  codeChip: {
    background: '#0b0e14',
    border: '1px dashed #00e676',
    color: '#00e676',
    fontSize: '12px',
    fontWeight: '700',
    padding: '5px 10px',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  toast: {
    position: 'fixed',
    top: '104px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1e293b',
    border: '1px solid #38bdf8',
    color: '#f8fafc',
    fontSize: '12px',
    padding: '7px 15px',
    borderRadius: '999px',
    zIndex: 70,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    maxWidth: '90vw',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  stackBanner: {
    position: 'fixed',
    bottom: '84px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#0284c7',
    color: '#fff',
    fontSize: '12px',
    padding: '6px 14px',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    zIndex: 60
  },
  emptyState: {
    position: 'absolute',
    top: '52%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    padding: '20px',
    maxWidth: '300px',
    pointerEvents: 'none'
  },
  bottomDock: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(19, 24, 34, 0.92)',
    backdropFilter: 'blur(14px)',
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid #2d3748',
    boxShadow: '0 14px 35px rgba(0,0,0,0.7)',
    zIndex: 50,
    maxWidth: '96vw',
    overflowX: 'auto'
  },
  noteBtn: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: '12px',
    padding: '10px 13px',
    borderRadius: '999px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  voiceBtn: {
    border: 'none',
    fontWeight: '800',
    fontSize: '12px',
    padding: '10px 18px',
    borderRadius: '999px',
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'none',
    whiteSpace: 'nowrap'
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
    padding: '16px'
  },
  noteModal: {
    width: '100%',
    maxWidth: '350px',
    background: '#131822',
    border: '1px solid #2d3748',
    borderRadius: '16px',
    padding: '18px'
  },
  noteInput: {
    width: '100%',
    padding: '11px 12px',
    borderRadius: '10px',
    border: '1px solid #334155',
    background: '#0b0e14',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  primaryMiniBtn: {
    background: '#00e676',
    border: 'none',
    color: '#051b11',
    fontWeight: '800',
    fontSize: '12px',
    padding: '7px 14px',
    borderRadius: '999px',
    cursor: 'pointer'
  }
};
