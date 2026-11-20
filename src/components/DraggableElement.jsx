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
  onReact
}) {
  const initialPos = element.transform_data || { x: 60, y: 110 };
  const [position, setPosition] = useState({ x: initialPos.x ?? 60, y: initialPos.y ?? 110 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const latestPosRef = useRef(position);
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
    const newY = Math.max(98, Math.round(e.clientY / currentZoom - dragOffsetRef.current.y));
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
  const isWip = Boolean(meta.is_wip);
  const ipProof = meta.ip_proof || null;

  return (
    <div
      data-card="true"
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

      {/* WIP Draft Badge */}
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
            marginRight: '22px'
          }}
        >
          🚧 WIP • Raw Draft
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
                border: '1px
