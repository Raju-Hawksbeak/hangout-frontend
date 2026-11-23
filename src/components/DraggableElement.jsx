import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

const REACTION_EMOJIS = ['🔥', '😂', '❤️', '👏'];

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      const parts = parsed.pathname.split('/');
      const embedIdx = parts.indexOf('embed');
      if (embedIdx !== -1 && parts[embedIdx + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIdx + 1]}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.includes('/canvases/media/stream/')) {
    const filePart = url.split('/canvases/media/stream/')[1];
    return `${API_BASE_URL}/canvases/media/stream/${filePart}`;
  }
  return url;
}

export default function DraggableElement({
  element,
  lockInfo,
  socketRef,
  currentUser,
  token,
  canvasId,
  zoom = 1,
  threadReplies = [],
  chainTracks = [],
  selectedTrackIds = [],
  isMixingThread = false,
  onToggleTrack,
  onSelectAllTracks,
  onClearTracks,
  onPlaySelected,
  isPlayingThread = false,
  onPlayThread,
  onDelete,
  onOpenTip,
  onInspectIp,
  onPinCard,
  onReact,
  onExpandPhoto,
  onStackAudio
}) {
  const meta = element.media_meta || {};
  const tData = element.transform_data || {};
  const author = meta.author || 'Member';
  const isOwner = Boolean(currentUser?.username && currentUser.username === author);
  const isLockedByOther = Boolean(lockInfo && lockInfo.locked_by !== currentUser?.id);

  const [pos, setPos] = useState({
    x: Number(tData.x ?? 80),
    y: Number(tData.y ?? 140)
  });
  const [cardWidth, setCardWidth] = useState(Number(tData.width ?? 272));
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const dragStartRef = useRef({ clientX: 0, clientY: 0, origX: 0, origY: 0 });
  const resizeStartRef = useRef({ clientX: 0, origWidth: 272 });
  const audioRef = useRef(null);

  useEffect(() => {
    if (!isDragging) {
      setPos({
        x: Number(tData.x ?? 80),
        y: Number(tData.y ?? 140)
      });
    }
    if (!isResizing && tData.width) {
      setCardWidth(Number(tData.width));
    }
  }, [tData.x, tData.y, tData.width, isDragging, isResizing]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleCardPointerDown = (e) => {
    if (
      isLockedByOther ||
      isResizing ||
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('label') ||
      e.target.closest('audio') ||
      e.target.closest('video') ||
      e.target.closest('iframe')
    ) {
      return;
    }

    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origX: pos.x,
      origY: pos.y
    };

    if (socketRef?.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'ELEMENT_LOCKED',
          canvas_id: canvasId,
          element_id: element.id,
          locked_by: currentUser?.id,
          username: currentUser?.username
        })
      );
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => {
      const dx = (e.clientX - dragStartRef.current.clientX) / (zoom || 1);
      const dy = (e.clientY - dragStartRef.current.clientY) / (zoom || 1);
      const nextX = Math.max(4, Math.round(dragStartRef.current.origX + dx));
      const nextY = Math.max(98, Math.round(dragStartRef.current.origY + dy));
      setPos({ x: nextX, y: nextY });

      if (socketRef?.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'ELEMENT_MOVING',
            canvas_id: canvasId,
            element_id: element.id,
            transform_data: { ...tData, x: nextX, y: nextY, width: cardWidth }
          })
        );
      }
    };

    const onUp = async () => {
      setIsDragging(false);
      const finalTransform = { ...tData, x: pos.x, y: pos.y, width: cardWidth };

      if (socketRef?.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'ELEMENT_RELEASED',
            canvas_id: canvasId,
            element_id: element.id,
            transform_data: finalTransform
          })
        );
      }

      try {
        await fetch(`${API_BASE_URL}/canvases/elements/${element.id}/transform`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ transform_data: finalTransform })
        });
      } catch {}
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDragging, pos.x, pos.y, cardWidth, tData, zoom, canvasId, element.id, socketRef, token]);

  const handleResizePointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      clientX: e.clientX,
      origWidth: cardWidth
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const onResizeMove = (e) => {
      const dx = (e.clientX - resizeStartRef.current.clientX) / (zoom || 1);
      const nextWidth = Math.max(220, Math.min(540, Math.round(resizeStartRef.current.origWidth + dx)));
      setCardWidth(nextWidth);
    };

    const onResizeUp = async () => {
      setIsResizing(false);
      const nextTransform = { ...tData, x: pos.x, y: pos.y, width: cardWidth };
      try {
        await fetch(`${API_BASE_URL}/canvases/elements/${element.id}/transform`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ transform_data: nextTransform })
        });
      } catch {}
    };

    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeUp);
    return () => {
      window.removeEventListener('pointermove', onResizeMove);
      window.removeEventListener('pointerup', onResizeUp);
    };
  }, [isResizing, cardWidth, pos.x, pos.y, tData, zoom, element.id, token]);

  const handleToggleAudio = () => {
    const src = resolveMediaUrl(element.media_url);
    if (!src) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const mediaUrl = resolveMediaUrl(element.media_url);
  const ytEmbed = element.element_type === 'video' ? getYouTubeEmbedUrl(element.media_url) : null;
  const reactions = meta.reactions || {};

  return (
    <div
      data-card="true"
      onPointerDown={handleCardPointerDown}
      style={{
        position: 'absolute',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${cardWidth}px`,
        zIndex: isDragging || isResizing ? 40 : Number(tData.z_index || 10),
        background: meta.is_qa
          ? 'rgba(38, 28, 8, 0.94)'
          : element.element_type === 'photo'
          ? '#f8fafc'
          : 'rgba(19, 24, 34, 0.94)',
        color: element.element_type === 'photo' ? '#0f172a' : '#f8fafc',
        border: isLockedByOther
          ? '1.5px solid #f59e0b'
          : meta.is_qa
          ? '1.5px solid #fbbf24'
          : '1px solid #334155',
        borderRadius: '14px',
        padding: '11px',
        boxShadow: isDragging
          ? '0 18px 40px rgba(0, 0, 0, 0.75)'
          : '0 8px 24px rgba(0, 0, 0, 0.45)',
        cursor: isLockedByOther ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Card Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          marginBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: '800',
              color: element.element_type === 'photo' ? '#0284c7' : '#6ee7b7'
            }}
          >
            @{author}
          </span>
          {meta.is_wip && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: '800',
                background: 'rgba(234, 179, 8, 0.2)',
                color: '#eab308',
                padding: '1px 5px',
                borderRadius: '5px'
              }}
            >
              WIP
            </span>
          )}
          {meta.reply_to_author && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: '700',
                background: 'rgba(56, 189, 248, 0.18)',
                color: '#38bdf8',
                padding: '1px 5px',
                borderRadius: '5px'
              }}
            >
              ↳ @{meta.reply_to_author}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {meta.ip_proof?.sha256 && (
            <button
              type="button"
              title="Inspect SHA-256 Proof"
              onClick={() => onInspectIp && onInspectIp(element)}
              style={miniActionStyle}
            >
              🛡️
            </button>
          )}
          {meta.tip_handle && (
            <button
              type="button"
              title="Send Creator Tip"
              onClick={() => onOpenTip && onOpenTip(element)}
              style={{ ...miniActionStyle, color: '#fbbf24' }}
            >
              💸
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              title="Delete Card"
              onClick={onDelete}
              style={{ ...miniActionStyle, color: '#fca5a5' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Card Content */}
      {element.element_type === 'text' && (
        <div
          style={{
            fontSize: '13px',
            lineHeight: '1.45',
            wordBreak: 'break-word',
            padding: '4px 2px'
          }}
        >
          {meta.is_qa ? `❓ ${meta.text}` : meta.text}
        </div>
      )}

      {element.element_type === 'photo' && mediaUrl && (
        <div>
          <img
            src={mediaUrl}
            alt={meta.caption || 'Polaroid'}
            style={{
              width: '100%',
              maxHeight: '190px',
              objectFit: 'cover',
              borderRadius: '8px',
              display: 'block'
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              marginTop: '7px'
            }}
          >
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: '700',
                color: '#1e293b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {meta.caption || 'Live Vibe'}
            </span>
            <button
              type="button"
              onClick={() => onExpandPhoto && onExpandPhoto(element)}
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: '800',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              🔍 View
            </button>
          </div>
        </div>
      )}

      {element.element_type === 'video' && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
            🎬 {meta.title || 'Stage Clip'}
          </div>
          {ytEmbed ? (
            <iframe
              src={ytEmbed}
              title={meta.title || 'Stage Clip'}
              style={{
                width: '100%',
                height: '150px',
                border: 'none',
                borderRadius: '8px',
                background: '#090d16'
              }}
              allowFullScreen
            />
          ) : (
            mediaUrl && (
              <video
                src={mediaUrl}
                controls={!meta.stream_only}
                controlsList={meta.stream_only ? 'nodownload' : undefined}
                style={{
                  width: '100%',
                  maxHeight: '160px',
                  borderRadius: '8px',
                  background: '#090d16'
                }}
              />
            )
          )}
        </div>
      )}

      {element.element_type === 'audio' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleToggleAudio}
              style={{
                background: isPlaying ? '#ef4444' : '#00e676',
                color: isPlaying ? '#fff' : '#051b11',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? '⏹ Stop' : '▶ Play'}
            </button>

            <button
              type="button"
              onClick={() => onStackAudio && onStackAudio(element)}
              style={{
                background: '#1e293b',
                color: '#7dd3fc',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '10.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              + Layer
            </button>

            {threadReplies.length > 0 && onPlayThread && (
              <button
                type="button"
                onClick={() => onPlayThread(element, threadReplies)}
                style={{
                  background: isPlayingThread ? '#38bdf8' : '#1e293b',
                  color: isPlayingThread ? '#082f49' : '#cbd5e1',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {isPlayingThread ? '⏹ Trail' : `🧵 Trail (${threadReplies.length + 1})`}
              </button>
            )}
          </div>

          {/* Selective Multi-Layer Mixer */}
          {chainTracks.length > 1 && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                marginTop: '8px',
                padding: '7px 8px',
                borderRadius: '9px',
                background: 'rgba(11, 14, 20, 0.88)',
                border: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '9.5px',
                  fontWeight: '800',
                  color: '#94a3b8'
                }}
              >
                <span>
                  LAYERS ({selectedTrackIds.length}/{chainTracks.length})
                </span>
                <span style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={onSelectAllTracks}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6ee7b7',
                      fontSize: '9.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={onClearTracks}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fca5a5',
                      fontSize: '9.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Clear
                  </button>
                </span>
              </div>

              {chainTracks.map((tr, idx) => {
                const checked = selectedTrackIds.includes(tr.id);
                const label =
                  tr.media_meta?.layer_label ||
                  `${idx === 0 ? 'Base' : `Layer ${idx}`} (@${tr.media_meta?.author || 'Member'})`;

                return (
                  <label
                    key={tr.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '10.5px',
                      color: checked ? '#f8fafc' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleTrack && onToggleTrack(tr.id)}
                      style={{ accentColor: '#00e676', cursor: 'pointer' }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  </label>
                );
              })}

              <button
                type="button"
                onClick={onPlaySelected}
                style={{
                  marginTop: '3px',
                  background: isMixingThread ? '#ef4444' : '#00e676',
                  color: isMixingThread ? '#fff' : '#051b11',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '5px 8px',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                {isMixingThread ? '⏹ Stop Mix' : `🎛️ Play Selected (${selectedTrackIds.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reactions & Pin Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
          marginTop: '8px',
          paddingTop: '6px',
          borderTop:
            element.element_type === 'photo'
              ? '1px solid rgba(15, 23, 42, 0.12)'
              : '1px solid rgba(51, 65, 85, 0.6)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
          {REACTION_EMOJIS.map((emoji) => {
            const count = reactions[emoji] || 0;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact && onReact(element.id, emoji)}
                style={{
                  background:
                    element.element_type === 'photo'
                      ? 'rgba(15, 23, 42, 0.07)'
                      : 'rgba(30, 41, 59, 0.8)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '2px 5px',
                  fontSize: '10px',
                  color: element.element_type === 'photo' ? '#0f172a' : '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                {emoji}
                {count > 0 ? ` ${count}` : ''}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPinCard && onPinCard(element)}
          style={{
            background: 'rgba(251, 191, 36, 0.16)',
            border: '1px solid rgba(251, 191, 36, 0.45)',
            color: element.element_type === 'photo' ? '#92400e' : '#fde047',
            borderRadius: '6px',
            padding: '2px 6px',
            fontSize: '9.5px',
            fontWeight: '800',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📌 Pin
        </button>
      </div>

      {/* Bottom-Right Resize Handle */}
      <div
        onPointerDown={handleResizePointerDown}
        title="Drag to resize card"
        style={{
          position: 'absolute',
          right: '4px',
          bottom: '4px',
          width: '14px',
          height: '14px',
          cursor: 'nwse-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          color: element.element_type === 'photo' ? '#475569' : '#94a3b8'
        }}
      >
        ↘
      </div>
    </div>
  );
}

const miniActionStyle = {
  background: 'rgba(15, 23, 42, 0.85)',
  border: '1px solid #334155',
  color: '#e2e8f0',
  borderRadius: '6px',
  padding: '2px 6px',
  fontSize: '10px',
  cursor: 'pointer'
};
