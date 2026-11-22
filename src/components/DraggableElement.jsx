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
  zoom = 1,
  threadReplies = [],
  onPlayThread,
  isPlayingThread = false,
  onStackAudio,
  onDelete,
  onOpenTip,
  onInspectIp,
  onPinCard,
  onReact,
  onExpandPhoto
}) {
  const initialPos = element.transform_data || { x: 24, y: 112 };
  const initialWidth = element.transform_data?.width || null;

  const [position, setPosition] = useState({
    x: initialPos.x ?? 24,
    y: initialPos.y ?? 112
  });
  const [cardWidth, setCardWidth] = useState(initialWidth);
  const [photoExpanded, setPhotoExpanded] = useState(false);

  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ startX: 0, startWidth: 260 });
  const latestPosRef = useRef(position);
  const latestWidthRef = useRef(cardWidth);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

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
    if (!isResizingRef.current && element.transform_data?.width) {
      setCardWidth(element.transform_data.width);
      latestWidthRef.current = element.transform_data.width;
    }
  }, [element.transform_data?.x, element.transform_data?.y, element.transform_data?.width]);

  const sendWs = (payload) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  const persistTransform = async (finalTransform) => {
    if (!token) return;
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
      console.error('Failed to persist transform:', err);
    }
  };

  const handlePointerDown = (e) => {
    if (
      e.target.closest('button') ||
      e.target.closest('a') ||
      e.target.closest('input') ||
      e.target.closest('iframe') ||
      e.target.closest('video') ||
      e.target.closest('[data-resize-handle="true"]')
    ) {
      return;
    }
    e.stopPropagation();
    if (isLockedByOther) return;

    const currentZoom = zoomRef.current || 1;
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX / currentZoom - latestPosRef.current.x,
      y: e.clientY / currentZoom - latestPosRef.current.y
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
    const currentZoom = zoomRef.current || 1;
    const newX = Math.max(8, Math.round(e.clientX / currentZoom - dragOffsetRef.current.x));
    const newY = Math.max(102, Math.round(e.clientY / currentZoom - dragOffsetRef.current.y));
    const updated = {
      ...(element.transform_data || {}),
      x: newX,
      y: newY,
      ...(latestWidthRef.current ? { width: latestWidthRef.current } : {})
    };

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
      y: latestPosRef.current.y,
      ...(latestWidthRef.current ? { width: latestWidthRef.current } : {})
    };

    sendWs({
      type: 'RELEASE_ELEMENT',
      canvas_id: canvasId,
      element_id: element.id,
      user_id: currentUser.id,
      transform_data: finalTransform
    });

    await persistTransform(finalTransform);
  };

  const handleResizePointerDown = (e) => {
    e.stopPropagation();
    if (isLockedByOther) return;

    const cardEl = e.currentTarget.closest('[data-card="true"]');
    const currentRectWidth = cardEl
      ? cardEl.getBoundingClientRect().width / (zoomRef.current || 1)
      : 260;
    const startW = latestWidthRef.current || Math.round(currentRectWidth);

    isResizingRef.current = true;
    resizeStartRef.current = {
      startX: e.clientX,
      startWidth: startW
    };

    window.addEventListener('pointermove', handleResizeMove);
    window.addEventListener('pointerup', handleResizeUp);
  };

  const handleResizeMove = (e) => {
    if (!isResizingRef.current) return;
    const currentZoom = zoomRef.current || 1;
    const deltaX = (e.clientX - resizeStartRef.current.startX) / currentZoom;
    const maxAllowed = Math.min(560, Math.max(240, window.innerWidth - 28));
    const nextWidth = Math.max(
      190,
      Math.min(maxAllowed, Math.round(resizeStartRef.current.startWidth + deltaX))
    );

    setCardWidth(nextWidth);
    latestWidthRef.current = nextWidth;
  };

  const handleResizeUp = async () => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;

    window.removeEventListener('pointermove', handleResizeMove);
    window.removeEventListener('pointerup', handleResizeUp);

    const finalTransform = {
      ...(element.transform_data || {}),
      x: latestPosRef.current.x,
      y: latestPosRef.current.y,
      width: latestWidthRef.current
    };

    sendWs({
      type: 'ELEMENT_RELEASED',
      canvas_id: canvasId,
      element_id: element.id,
      transform_data: finalTransform
    });

    await persistTransform(finalTransform);
  };

  const meta = element.media_meta || {};
  const reactions = meta.reactions || {};
  const ytEmbedUrl = element.element_type === 'video' ? getYouTubeEmbedUrl(element.media_url) : null;
  const finalMediaUrl = resolveMediaUrl(element.media_url);
  const hasTipHandle = Boolean(meta.tip_handle);
  const isPhoto = element.element_type === 'photo';
  const isStacked = Boolean(element.transform_data?.is_stacked || element.parent_element_id);
  const isWip = Boolean(meta.is_wip);
  const isQa = Boolean(meta.is_qa);
  const ipProof = meta.ip_proof || null;

  const computedMaxWidth = cardWidth ? `${cardWidth}px` : 'min(340px, 88vw)';
  const computedWidth = cardWidth ? `${cardWidth}px` : 'auto';
  const photoHeight = cardWidth
    ? `${Math.max(190, Math.min(440, Math.round(cardWidth * 0.85)))}px`
    : photoExpanded
    ? '340px'
    : '205px';

  return (
    <div
      data-card="true"
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: computedWidth,
        maxWidth: computedMaxWidth,
        boxSizing: 'border-box',
        touchAction: 'none',
        cursor: isLockedByOther ? 'not-allowed' : 'grab',
        opacity: isLockedByOther ? 0.78 : 1,
        border: isLockedByOther
          ? '2px dashed #ff9100'
          : isQa
          ? '1.5px solid #fbbf24'
          : isWip
          ? '1.5px dashed #eab308'
          : element.element_type === 'video'
          ? '1px solid #f43f5e'
          : isPhoto
          ? '1px solid #e2e8f0'
          : isStacked
          ? '1.5px solid #38bdf8'
          : '1px solid #263042',
        boxShadow: isLockedByOther
          ? '0 0 16px rgba(255, 145, 0, 0.35)'
          : isQa
          ? '0 10px 26px rgba(251, 191, 36, 0.22)'
          : isStacked
          ? '0 10px 26px rgba(56, 189, 248, 0.22)'
          : '0 10px 28px rgba(0, 0, 0, 0.55)',
        borderRadius: isPhoto ? '12px' : '16px',
        padding: isPhoto ? '10px 10px 14px 10px' : '12px 14px 16px 14px',
        background: isPhoto ? '#f8fafc' : 'rgba(22, 28, 38, 0.95)',
        backdropFilter: 'blur(10px)',
        userSelect: 'none',
        zIndex: element.transform_data?.z_index || (isStacked ? 5 : 1)
      }}
    >
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
            width: '24px',
            height: '24px',
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

      {isWip && (
        <div
          style={{
            display: 'inline-block',
            fontSize: '9.5px',
            fontWeight: '800',
            color: '#fde047',
            background: 'rgba(234, 179, 8, 0.16)',
            border: '1px solid rgba(234, 179, 8, 0.45)',
            padding: '2px 7px',
            borderRadius: '999px',
            marginBottom: '6px',
            marginRight: '24px'
          }}
        >
          🚧 WIP • Raw Draft
        </div>
      )}

      {isStacked && (
        <div
          style={{
            fontSize: '10px',
            color: '#38bdf8',
            fontWeight: '800',
            marginBottom: '6px',
            paddingRight: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>↳ Voice Layer on @{meta.reply_to_author || 'Original'}</span>
        </div>
      )}

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
                padding: '6px 10px',
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

      {element.element_type === 'video' && (
        <div style={{ width: '100%', minWidth: '210px' }}>
          <div
            style={{
              fontSize: '10px',
              color: '#fb7185',
              fontWeight: '800',
              marginBottom: '6px',
              paddingRight: '26px',
              letterSpacing: '0.4px'
            }}
          >
            🎬 STAGE CLIP • {meta.author || 'Member'}
          </div>
          {ytEmbedUrl ? (
            <iframe
              width="100%"
              height={cardWidth ? Math.round(cardWidth * 0.56) : 165}
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
              controlsList={meta.stream_only !== false ? 'nodownload' : undefined}
              playsInline
              style={{
                width: '100%',
                maxHeight: cardWidth ? `${Math.round(cardWidth * 0.85)}px` : '230px',
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

      {isPhoto && (
        <div style={{ width: '100%', minWidth: '180px' }}>
          <img
            src={finalMediaUrl}
            alt={meta.caption || 'Canvas snapshot'}
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              if (onExpandPhoto) {
                onExpandPhoto(element);
              } else {
                setPhotoExpanded((prev) => !prev);
              }
            }}
            title="Tap to view larger"
            style={{
              width: '100%',
              height: photoHeight,
              objectFit: photoExpanded || cardWidth ? 'contain' : 'cover',
              borderRadius: '6px',
              display: 'block',
              background: '#0f172a',
              cursor: 'zoom-in'
            }}
          />
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px'
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#0f172a',
                wordBreak: 'break-word'
              }}
            >
              {meta.caption || 'Live Moment'}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onExpandPhoto) {
                  onExpandPhoto(element);
                } else {
                  setPhotoExpanded((prev) => !prev);
                }
              }}
              style={{
                background: '#e2e8f0',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '10px',
                fontWeight: '800',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              🔍 View
            </button>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
            📸 @{meta.author || 'Member'}
          </div>
        </div>
      )}

      {element.element_type === 'text' && (
        <div style={{ width: '100%', minWidth: '190px', paddingRight: '20px' }}>
          <div
            style={{
              fontSize: '10px',
              color: isQa ? '#fbbf24' : '#a78bfa',
              fontWeight: '800',
              marginBottom: '4px'
            }}
          >
            {isQa ? '❓ LISTENER Q&A' : 'NOTE'} • @{meta.author || 'Member'}
          </div>
          <div style={{ fontSize: '14px', color: '#f8fafc', lineHeight: '1.45', wordBreak: 'break-word' }}>
            {meta.text || 'Sticky Note'}
          </div>
        </div>
      )}

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
                  padding: '3px 7px',
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

      {ipProof && onInspectIp && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspectIp(element);
          }}
          title="View SHA-256 Proof of Creation Certificate"
          style={{
            marginTop: '7px',
            width: '100%',
            background: isPhoto ? '#e2e8f0' : 'rgba(0, 230, 118, 0.08)',
            border: isPhoto ? '1px solid #cbd5e1' : '1px solid rgba(0, 230, 118, 0.3)',
            color: isPhoto ? '#0f172a' : '#6ee7b7',
            fontSize: '9.5px',
            fontWeight: '700',
            padding: '5px 8px',
            borderRadius: '7px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>🛡️ {ipProof.short_hash}</span>
          <span>{meta.stream_only !== false ? '🔒 Stream' : '⬇ DL'}</span>
        </button>
      )}

      {onPinCard && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPinCard(element);
          }}
          style={{
            marginTop: '6px',
            width: '100%',
            background: isPhoto ? '#e2e8f0' : 'rgba(251, 191, 36, 0.12)',
            border: isPhoto ? '1px solid #cbd5e1' : '1px solid rgba(251, 191, 36, 0.4)',
            color: isPhoto ? '#0f172a' : '#fde047',
            fontSize: '10px',
            fontWeight: '800',
            padding: '5px 8px',
            borderRadius: '7px',
            cursor: 'pointer'
          }}
        >
          📌 Pin to Live Stage
        </button>
      )}

      {hasTipHandle && onOpenTip && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTip(element);
          }}
          style={{
            marginTop: '6px',
            width: '100%',
            background: 'linear-gradient(90deg, #f59e0b, #eab308)',
            border: 'none',
            color: '#1e1b04',
            fontSize: '11px',
            fontWeight: '800',
            padding: '6px 10px',
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

      {!isLockedByOther && (
        <div
          data-resize-handle="true"
          onPointerDown={handleResizePointerDown}
          title="Drag to resize"
          style={{
            position: 'absolute',
            right: '4px',
            bottom: '4px',
            width: '22px',
            height: '22px',
            borderRadius: '6px',
            background: isPhoto ? 'rgba(15, 23, 42, 0.12)' : 'rgba(148, 163, 184, 0.16)',
            color: isPhoto ? '#0f172a' : '#cbd5e1',
            fontSize: '11px',
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'nwse-resize',
            touchAction: 'none',
            zIndex: 12
          }}
        >
          ↘
        </div>
      )}
    </div>
  );
}
