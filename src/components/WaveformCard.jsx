import React, { useState, useRef, useEffect } from 'react';

export default function WaveformCard({
  mediaUrl,
  peaks = [],
  duration = 0,
  authorName = 'Member',
  isStacked = false,
  onStackAudio
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioError, setAudioError] = useState('');
  const audioRef = useRef(null);

  const safePeaks =
    Array.isArray(peaks) && peaks.length > 0
      ? peaks
      : [0.3, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 0.95, 0.6, 0.3, 0.5, 0.8, 0.4, 0.6, 0.3];

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = async (e) => {
    e.stopPropagation();
    setAudioError('');

    if (!mediaUrl) {
      setAudioError('No audio file attached to this card.');
      return;
    }

    try {
      if (!audioRef.current || audioRef.current.src !== mediaUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(mediaUrl);
        audio.preload = 'auto';

        audio.ontimeupdate = () => {
          if (audio.duration && !isNaN(audio.duration)) {
            setProgress(audio.currentTime / audio.duration);
          }
        };

        audio.onended = () => {
          setIsPlaying(false);
          setProgress(0);
        };

        audio.onerror = () => {
          setIsPlaying(false);
          setAudioError('Audio file missing or unsupported format.');
        };

        audioRef.current = audio;
      }

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setIsPlaying(false);
      setAudioError('Could not play audio. Try recording a fresh drop.');
    }
  };

  const formatDuration = (sec) => {
    const s = Math.max(1, Math.round(sec || 0));
    return `${s}s`;
  };

  return (
    <div style={{ width: '235px' }}>
      {/* Author & Duration Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          paddingRight: '20px'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#00e676' }}>
          {isStacked ? '↳ ' : '🎙 '}
          {authorName}
        </span>
        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
          {formatDuration(duration)}
        </span>
      </div>

      {/* Play Button + Animated Waveform Bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={togglePlay}
          style={{
            background: isPlaying ? '#ff1744' : '#00e676',
            color: isPlaying ? '#fff' : '#051b11',
            border: 'none',
            borderRadius: '999px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: '800',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            height: '28px',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {safePeaks.slice(0, 24).map((val, idx) => {
            const barRatio = idx / 24;
            const isActive = isPlaying && barRatio <= progress;
            const heightPx = Math.max(5, Math.min(28, Math.round((val || 0.2) * 28)));
            return (
              <span
                key={idx}
                style={{
                  width: '3px',
                  height: `${heightPx}px`,
                  borderRadius: '2px',
                  background: isActive ? '#00e676' : '#475569',
                  transition: 'background 0.1s ease'
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Error Message if Audio Fails */}
      {audioError && (
        <div style={{ fontSize: '10px', color: '#f87171', marginBottom: '6px' }}>
          {audioError}
        </div>
      )}

      {/* Layer Sound Button */}
      {onStackAudio && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStackAudio();
          }}
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid #334155',
            color: '#cbd5e1',
            fontSize: '11px',
            fontWeight: '600',
            padding: '5px 8px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          + Layer Sound
        </button>
      )}
    </div>
  );
}
