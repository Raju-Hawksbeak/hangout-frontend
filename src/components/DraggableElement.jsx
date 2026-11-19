import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import WaveformCard from './WaveformCard';

const REACTION_EMOJIS = ['🔥', '😂', '❤️', '👏'];

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : null;
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
  threadReplies = [],
  onPlayThread,
  isPlayingThread = false,
  onStackAudio,
  onDelete,
  onOpenTip,
  onReact
}) {
  const initialPos = element.transform_data || { x: 60, y: 110 };
  const [position, setPosition] = useState({ x: initialPos.x ?? 60, y: initialPos.y ?? 110 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const latestPosRef = useRef(position);

  const isLockedByOther = Boolean(lockInfo && lockInfo.locked_by !== currentUser.id);

  useEffect(() => {
    if (!isDraggingRef.current && element.transform_data) {
      const nextPos = {
        x: element.transform_data.x ?? position.x,
        y: element.transform_data.y ?? position.y
      };
      setPosition(nextPos);
      latestPosRef.current = nextPos;
    }
  }, [element.transform_data?.x, element.transform_data?.y]);

  const sendWs = (payload) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  const handlePointerDown = (e) => {
    if (
      e.target.closest('button') ||
      e.target.closest('a') ||
      e.target.closest('input') ||
      e.target.closest('iframe') ||
      e.target.closest('video')
    ) {
      return;
    }
    if (isLockedByOther) return;

    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - latestPosRef.current.x,
      y: e.clientY - latestPosRef.current.y
    };

    sendWs({
      type: 'GRAB_ELEMENT',
      canvas_id: canvasId,
      element_id: element.id,
      user_id: currentUser.id,
      username: currentUser.username
    });

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const newX = Math.max(8, e.clientX - dragOffsetRef.current.x);
    const newY = Math.max(98, e.clientY - dragOffsetRef.current.y);
    const updated = { ...(element.transform_data || {}), x: newX, y: newY };

    setPosition({ x: newX, y: newY });
    latestPosRef.current = { x: newX, y: newY };

    sendWs({
      type: 'DRAG_MOVE',
      canvas_id: canvasId,
      element_id: element.id,
      user_id: currentUser.id,
      username: currentUser.username,
      transform_data: updated
    });
  };

  const handlePointerUp = async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);

    const finalTransform = {
      ...(element.transform_data || {}),
      x: latestPosRef.current.x,
      y: latestPosRef.current.y
    };

    sendWs({
      type: 'RELEASE_ELEMENT',
      canvas_id: canvasId,
      element_id: element.id,
      user_id: currentUser.id,
      transform_data: finalTransform
    });

    // Persist final position in PostgreSQL database
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/canvases/elements/${element.id}/transform`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ transform_data: finalTransform })
        });
      } catch (err) {
        console.error('Failed to persist position:', err);
      }
    }
  };

  const meta = element.media_meta || {};
  const reactions = meta.reactions || {};
  const ytEmbedUrl = element.element_type === 'video' ? getYouTubeEmbedUrl(element.media_url) : null;
  const finalMediaUrl = resolveMediaUrl(element.media_url);
  const hasTipHandle = Boolean(meta.tip_handle);
  const isPhoto = element.element_type === 'photo';
  const isStacked = Boolean(element.transform_data?.is_stacked || element.parent_element_id);

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
        cursor: isLockedByOther ? 'not-allowed' : 'grab',
        opacity: isLockedByOther ? 0.78 : 1,
        border: isLockedByOther
          ? '2px dashed #ff9100'
          : element.element_type === 'video'
          ? '1px solid #f43f5e'
          : isPhoto
          ? '1px solid #e2e8f0'
          : isStacked
          ? '1.5px solid #38bdf8'
          : '1px solid #263042',
        boxShadow: isLockedByOther
          ? '0 0 16px rgba(255, 145, 0, 0.35)'
          : isStacked
          ? '0 10px 26px rgba(56, 189, 248, 0.22)'
          : '0 10px 28px rgba(0, 0, 0, 0.55)',
        borderRadius: isPhoto ? '12px' : '16px',
        padding: isPhoto ? '10px 10px 12px 10px' : '12px 14px',
        background: isPhoto ? '#f8fafc' : 'rgba(22, 28, 38, 0.95)',
        backdropFilter: 'blur(10px)',
        userSelect: 'none',
        zIndex: element.transform_data?.z_index || (isStacked ? 5 : 1)
      }}
    >
      {/* Top-right Delete Button */}
      {onDelete && !isLockedByOther && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete card"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: '11px',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          ✕
        </button>
      )}

      {isLockedByOther && (
        <div style={{ fontSize: '10px', color: '#ff9100', marginBottom: '6px', fontWeight: '700' }}>
          ✎ {lockInfo.username} is moving...
        </div>
      )}

      {/* Threaded Reply Connector Badge */}
      {isStacked && (
        <div
          style={{
            fontSize: '10px',
            color: '#38bdf8',
            fontWeight: '800',
            marginBottom: '6px',
            paddingRight: '22px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>↳ Voice Layer on @{meta.reply_to_author || 'Original'}</span>
        </div>
      )}

      {/* 1. Audio Waveform Card */}
      {element.element_type === 'audio' && (
        <>
          <WaveformCard
            mediaUrl={element.media_url}
            peaks={meta.peaks}
            duration={meta.duration}
            authorName={meta.author || 'Member'}
            isStacked={isStacked}
            onStackAudio={() => onStackAudio(element)}
          />

          {threadReplies.length > 0 && onPlayThread && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayThread(element, threadReplies);
              }}
              style={{
                marginTop: '8px',
                width: '100%',
                background: isPlayingThread ? '#ef4444' : 'rgba(56, 189, 248, 0.16)',
                border: '1px solid #38bdf8',
                color: isPlayingThread ? '#fff' : '#7dd3fc',
                fontSize: '11px',
                fontWeight: '800',
                padding: '5px 10px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {isPlayingThread
                ? '⏹ Stop Thread Chain'
                : `▶ Play Thread (${threadReplies.length + 1} clips)`}
            </button>
          )}
        </>
      )}

      {/* 2. Stage Clip */}
      {element.element_type === 'video' && (
        <div style={{ width: '270px' }}>
          <div
            style={{
              fontSize: '10px',
              color: '#fb7185',
              fontWeight: '800',
              marginBottom: '6px',
              paddingRight: '24px',
              letterSpacing: '0.4px'
            }}
          >
            🎬 STAGE CLIP • {meta.author || 'Member'}
          </div>
          {ytEmbedUrl ? (
            <iframe
              width="270"
              height="155"
              src={ytEmbedUrl}
              title={meta.title || 'Stage Clip'}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: '10px', display: 'block', background: '#000' }}
            />
          ) : (
            <video
              src={finalMediaUrl}
              controls
              playsInline
              style={{
                width: '270px',
                maxHeight: '220px',
                borderRadius: '10px',
                display: 'block',
                background: '#000'
              }}
            />
          )}
          {meta.title && (
            <div style={{ fontSize: '12px', color: '#f1f5f9', fontWeight: '600', marginTop: '6px' }}>
              {meta.title}
            </div>
          )}
        </div>
      )}

      {/* 3. Polaroid Photo Card */}
      {isPhoto && (
        <div style={{ width: '210px' }}>
          <img
            src={finalMediaUrl}
            alt={meta.caption || 'Canvas snapshot'}
            draggable={false}
            style={{
              width: '210px',
              height: '190px',
              objectFit: 'cover',
              borderRadius: '6px',
              display: 'block',
              background: '#cbd5e1'
            }}
          />
          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#0f172a',
              wordBreak: 'break-word'
            }}
          >
            {meta.caption || 'Live Moment'}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
            📸 @{meta.author || 'Member'}
          </div>
        </div>
      )}

      {/* 4. Sticky Note Card */}
      {element.element_type === 'text' && (
        <div style={{ maxWidth: '220px', paddingRight: '18px' }}>
          <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '700', marginBottom: '4px' }}>
            NOTE • {meta.author || 'Member'}
          </div>
          <div style={{ fontSize: '14px', color: '#f8fafc', lineHeight: '1.4', wordBreak: 'break-word' }}>
            {meta.text || 'Sticky Note'}
          </div>
        </div>
      )}

      {/* Live Emoji Reactions Bar */}
      {onReact && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            flexWrap: 'wrap'
          }}
        >
          {REACTION_EMOJIS.map((emoji) => {
            const count = reactions[emoji] || 0;
            return (
              <button
                key={emoji}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReact(element.id, emoji);
                }}
                style={{
                  background: isPhoto
                    ? count > 0
                      ? '#e2e8f0'
                      : '#f1f5f9'
                    : count > 0
                    ? 'rgba(56, 189, 248, 0.18)'
                    : 'rgba(15, 23, 42, 0.7)',
                  border: isPhoto
                    ? '1px solid #cbd5e1'
                    : count > 0
                    ? '1px solid rgba(56, 189, 248, 0.5)'
                    : '1px solid #334155',
                  color: isPhoto ? '#0f172a' : '#e2e8f0',
                  borderRadius: '999px',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <span>{emoji}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Zero-Commission Creator Tip Action */}
      {hasTipHandle && onOpenTip && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTip(element);
          }}
          style={{
            marginTop: '8px',
            width: '100%',
            background: 'linear-gradient(90deg, #f59e0b, #eab308)',
            border: 'none',
            color: '#1e1b04',
            fontSize: '11px',
            fontWeight: '800',
            padding: '5px 10px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          💸 Tip @{meta.author || 'Creator'}
        </button>
      )}
    </div>
  );
}
