import React, { useState } from 'react';

export default function ThekLogo({
  accent = '#00e676',
  height = 26,
  useImage = true
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (useImage && !imgFailed) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          userSelect: 'none'
        }}
      >
        <img
          src="/thek-logo.png"
          alt="tHek"
          onError={() => setImgFailed(true)}
          style={{
            height: `${height}px`,
            width: 'auto',
            objectFit: 'contain',
            borderRadius: '6px',
            display: 'block'
          }}
        />
      </span>
    );
  }

  return (
    <svg
      height={height}
      viewBox="0 0 156 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="tHek"
      style={{ width: 'auto', display: 'block', userSelect: 'none' }}
    >
      <defs>
        <linearGradient id="thekWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      <path
        d="M14 10H22V19H31V25H22V38C22 40.5 23.4 41.8 26 41.8C27.8 41.8 29.4 41.3 30.8 40.6L32.4 46.2C30.2 47.4 27.6 48 24.4 48C17.6 48 14 44.3 14 37.8V10Z"
        fill="#f1f5f9"
      />
      <rect x="42" y="10" width="9.5" height="37" rx="2.5" fill="url(#thekWaveGrad)" />
      <rect x="74.5" y="10" width="9.5" height="37" rx="2.5" fill="url(#thekWaveGrad)" />
      <path
        d="M36 29.5H46.5L50 24L53.5 35L57 17L60.5 41L64 21L67.5 34.5L71 25.5L74.5 29.5H89"
        stroke="url(#thekWaveGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M115 35.8H96.2C97.1 40.2 100.4 42.6 105.2 42.6C108.6 42.6 111.4 41.5 113.8 39.8L116.8 44.5C113.6 46.9 109.6 48.2 104.6 48.2C94.6 48.2 88.5 42.1 88.5 32.8C88.5 23.4 94.5 17.5 103.5 17.5C111.8 17.5 116.2 23.2 116.2 32.4C116.2 33.7 116.1 34.8 115.9 35.8H115ZM96.3 30.6H108.8C108.5 25.8 106.2 22.9 102.8 22.9C99.1 22.9 96.9 25.6 96.3 30.6Z"
        fill="#f1f5f9"
      />
      <path
        d="M123 8H131V30.2L142.8 18.2H152L139.2 31.2L153 47.5H143.2L133.5 35.8L131 38.2V47.5H123V8Z"
        fill="#f1f5f9"
      />
    </svg>
  );
}
