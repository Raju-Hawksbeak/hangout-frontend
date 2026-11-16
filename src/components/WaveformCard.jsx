import React, { useState, useRef, useEffect } from 'react';

export default function WaveformCard({
  mediaUrl,
  peaks = [],
  duration = 0,
  authorName = 'Friend',
  isStacked = false,
  onStackAudio
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(mediaUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [mediaUrl]);

  const togglePlay = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !mediaUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const displayPeaks =
    peaks && peaks.length > 0
      ? peaks
      : [25, 45, 70, 50, 85, 60, 40, 75, 90, 55, 35, 65, 80, 45, 30, 60, 75, 40, 55, 30];

  return (
    <div style={{ width: '235px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: isStacked ? '#38bdf8' : '#00e676', fontWeight: 700, letterSpacing: '0.5px' }}>
          {isStacked ? `↳ LAYER • ${authorName}` : `● VOICE DROP • ${authorName}`}
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{duration || 5}s</span>
      </div>

      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={togglePlay}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2.5px',
          height: '38px',
          cursor: 'pointer',
          padding: '4px 0'
        }}
      >
        {displayPeaks.map((p, idx) => {
          const isBarPlayed = (idx / displayPeaks.length) * 100 <= progress;
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${Math.max(14, p)}%`,
                borderRadius: '2px',
                background: isBarPlayed ? (isStacked ? '#38bdf8' : '#00e676') : '#475569',
                transition: 'background 0.1s ease'
              }}
            />
          );
        })}
      </div>

      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', alignItems: 'center' }}
      >
        <button
          onClick={togglePlay}
          style={{
            background: isPlaying ? '#ff1744' : isStacked ? '#38bdf8' : '#00e676',
            border: 'none',
            color: '#051b11',
            fontWeight: '800',
            fontSize: '11px',
            padding: '4px 12px',
            borderRadius: '999px',
            cursor: 'pointer'
          }}
        >
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onStackAudio && onStackAudio();
          }}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #334155',
            color: '#cbd5e1',
            fontSize: '11px',
            fontWeight: '600',
            padding: '4px 10px',
            borderRadius: '999px',
            cursor: 'pointer'
          }}
        >
          + Layer Sound
        </button>
      </div>
    </div>
  );
}
