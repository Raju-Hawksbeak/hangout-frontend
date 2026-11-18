import React, { useState, useRef, useEffect } from 'react';
import WaveformCard from './WaveformCard';

export default function DraggableElement({
  element,
  lockInfo,
  socketRef,
  currentUser,
  canvasId,
  onStackAudio,
  onDelete
}) {
  const initialPos = element.transform_data || { x: 60, y: 100 };
  const [position, setPosition] = useState({ x: initialPos.x ?? 60, y: initialPos.y ?? 100 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const latestPosRef = useRef(position);

  const isLockedByOther = Boolean(lockInfo && lockInfo.locked_by !== currentUser.id);

  // Sync position when another user moves or releases the element
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
    // Allow clicks on PLAY, + Layer Sound, Delete, or links without triggering card drag
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) {
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
    const newY = Math.max(60, e.clientY - dragOffsetRef.current.y);
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

  const handlePointerUp = () => {
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
  };

  const meta = element.media_meta || {};

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
          : element.transform_data?.is_stacked
          ? '1px solid #0284c7'
          : '1px solid #263042',
        boxShadow: isLockedByOther
          ? '0 0 16px rgba(255, 145, 0, 0.35)'
          : '0 10px 28px rgba(0, 0, 0, 0.55)',
        borderRadius: '16px',
        padding: '12px 14px',
        background: 'rgba(22, 28, 38, 0.94)',
        backdropFilter: 'blur(10px)',
        userSelect: 'none',
        zIndex: element.transform_data?.z_index || 1
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
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#94a3b8',
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

      {element.element_type === 'audio' ? (
        <WaveformCard
          mediaUrl={element.media_url}
          peaks={meta.peaks}
          duration={meta.duration}
          authorName={meta.author || 'Member'}
          isStacked={Boolean(element.transform_data?.is_stacked)}
          onStackAudio={() => onStackAudio(element)}
        />
      ) : (
        <div style={{ maxWidth: '220px', paddingRight: '18px' }}>
          <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '700', marginBottom: '4px' }}>
            NOTE • {meta.author || 'Member'}
          </div>
          <div style={{ fontSize: '14px', color: '#f8fafc', lineHeight: '1.4', wordBreak: 'break-word' }}>
            {meta.text || 'Sticky Note'}
          </div>
        </div>
      )}
    </div>
  );
}
