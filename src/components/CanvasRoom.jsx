import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_BASE_URL, DEFAULT_CANVAS_ID } from '../config';
import { extractWaveformPeaks } from '../audioUtils';
import DraggableElement from './DraggableElement';

export default function CanvasRoom({ user, token, inviteCodes = [], onLogout }) {
  const [canvasId, setCanvasId] = useState(DEFAULT_CANVAS_ID);
  const [elements, setElements] = useState([]);
  const [locks, setLocks] = useState({});
  const [wsConnected, setWsConnected] = useState(false);

  // Voice recording & stacking state
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stackTarget, setStackTarget] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Quick sticky note & invite drawer state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showInvites, setShowInvites] = useState(false);
  const [statusBanner, setStatusBanner] = useState('');

  const socketRef = useRef(null);

  // 1. Fetch existing elements from backend
  const loadElements = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/canvases/${canvasId}/elements`);
      if (res.ok) {
        const data = await res.json();
        setElements(data);
      }
    } catch (err) {
      console.error('Failed to fetch canvas elements:', err);
    }
  };

  // 2. Connect real-time WebSocket hub
  useEffect(() => {
    loadElements();

    const ws = new WebSocket(`${WS_BASE_URL}/canvases/ws/${canvasId}`);
    socketRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'NEW_ELEMENT' && msg.element) {
          setElements((prev) =>
            prev.some((el) => el.id === msg.element.id) ? prev : [...prev, msg.element]
          );
        } else if (msg.type === 'NEW_AUDIO_LAYER' && msg.element) {
          setElements((prev) =>
            prev.some((el) => el.id === msg.element.id) ? prev : [...prev, msg.element]
          );
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

  // 3. Start Voice Recording
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

  // 4. Stop Voice Recording
  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  // 5. Extract Peaks -> Upload via Backend -> Persist Element -> Broadcast
  const handleAudioUploadAndDrop = async (audioBlob) => {
    setIsUploading(true);
    try {
      const { peaks, duration } = await extractWaveformPeaks(audioBlob, 30);

      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-drop.webm');

      const uploadRes = await fetch(`${API_BASE_URL}/canvases/media/upload-direct`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.detail || 'Audio storage upload failed');
      }

      const { media_url } = uploadData;

      const randomX = Math.floor(40 + Math.random() * Math.max(120, window.innerWidth - 310));
      const randomY = Math.floor(90 + Math.random() * Math.max(160, window.innerHeight - 280));

      const payload = {
        canvas_id: canvasId,
        element_type: 'audio',
        media_url,
        media_meta: {
          peaks,
          duration,
          author: user.username
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

     // if (!saveRes.ok) throw new Error('Failed to save voice drop');
     // const savedElement = await saveRes.json();
       /* const saveData = await saveRes.json();
        if (!saveRes.ok) throw new Error(saveData.detail || 'Failed to save voice drop');
        const savedElement = saveData;*/
      const savedElement = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(savedElement.detail || JSON.stringify(savedElement));
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
  // 6. Drop a Quick Text Sticky Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      const randomX = Math.floor(50 + Math.random() * Math.max(120, window.innerWidth - 280));
      const randomY = Math.floor(90 + Math.random() * Math.max(160, window.innerHeight - 250));

      const payload = {
        canvas_id: canvasId,
        element_type: 'text',
        media_url: null,
        media_meta: {
          text: noteText.trim(),
          author: user.username
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

      if (res.ok) {
        const saved = await res.json();
        setElements((prev) => [...prev, saved]);
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'NEW_ELEMENT',
              canvas_id: canvasId,
              element: saved
            })
          );
        }
        setNoteText('');
        setShowNoteModal(false);
      }
    } catch (err) {
      setStatusBanner('Could not post note.');
    }
  };

  return (
    <div style={styles.board}>
      {/* Top Bar */}
      <header style={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: wsConnected ? '#00e676' : '#f59e0b'
            }}
          />
          <div>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#fff' }}>Live Jam Canvas</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>@{user.username}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowInvites(!showInvites)} style={styles.pillBtn}>
            Invites ({inviteCodes.length})
          </button>
          <button onClick={onLogout} style={{ ...styles.pillBtn, color: '#fca5a5' }}>
            Exit
          </button>
        </div>
      </header>

      {/* Invite Codes Drawer */}
      {showInvites && (
        <div style={styles.inviteDrawer}>
          <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#00e676' }}>
            Your Exclusive Friend Invite Codes:
          </div>
          {inviteCodes.length > 0 ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {inviteCodes.map((code) => (
                <span
                  key={code}
                  onClick={() => {
                    navigator.clipboard?.writeText(code);
                    setStatusBanner(`Copied invite code: ${code}`);
                  }}
                  style={styles.codeChip}
                >
                  {code} 📋
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
            The Canvas is Quiet...
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Hold the green mic button below to drop the first voice wave, or add a sticky note!
          </div>
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
          onStackAudio={(targetEl) => {
            setStackTarget(targetEl);
            setStatusBanner('Hold the Voice Drop button below to record your layered reply!');
          }}
        />
      ))}

      {/* Sticky Note Modal */}
      {showNoteModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowNoteModal(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddNote}
            style={styles.noteModal}
          >
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px' }}>Drop a Sticky Note</div>
            <input
              type="text"
              placeholder="Write a vibe, lyric, or thought..."
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

      {/* Bottom Floating Dock */}
      <div style={styles.bottomDock}>
        <button onClick={() => setShowNoteModal(true)} style={styles.noteBtn}>
          + Note
        </button>

        <button
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          disabled={isUploading}
          className={isRecording ? 'recording-pulse' : ''}
          style={{
            ...styles.voiceBtn,
            background: isRecording ? '#ff1744' : isUploading ? '#475569' : '#00e676',
            color: isRecording ? '#ffffff' : '#051b11'
          }}
        >
          {isUploading
            ? 'Dropping Wave...'
            : isRecording
            ? '● Recording... Release to Drop'
            : stackTarget
            ? '🎙 Hold to Layer Sound'
            : '🎙 Hold to Voice Drop'}
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
    backgroundColor: '#0b0e14',
    backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
    backgroundSize: '24px 24px'
  },
  topBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '58px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(11, 14, 20, 0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #1e293b',
    zIndex: 50
  },
  pillBtn: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#e2e8f0',
    fontSize: '12px',
    fontWeight: '600',
    padding: '6px 12px',
    borderRadius: '999px',
    cursor: 'pointer'
  },
  inviteDrawer: {
    position: 'fixed',
    top: '64px',
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
    top: '68px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1e293b',
    border: '1px solid #38bdf8',
    color: '#f8fafc',
    fontSize: '12px',
    padding: '8px 16px',
    borderRadius: '999px',
    zIndex: 70,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
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
    top: '50%',
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
    gap: '10px',
    background: 'rgba(19, 24, 34, 0.92)',
    backdropFilter: 'blur(14px)',
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid #2d3748',
    boxShadow: '0 14px 35px rgba(0,0,0,0.7)',
    zIndex: 50
  },
  noteBtn: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: '13px',
    padding: '12px 16px',
    borderRadius: '999px',
    cursor: 'pointer'
  },
  voiceBtn: {
    border: 'none',
    fontWeight: '800',
    fontSize: '13px',
    padding: '12px 22px',
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
    maxWidth: '340px',
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
    outline: 'none'
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
