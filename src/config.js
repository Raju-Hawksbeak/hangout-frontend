export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://hangout-api-a6jp.onrender.com';

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export const DEFAULT_CANVAS_ID =
  import.meta.env.VITE_DEFAULT_CANVAS_ID || '11111111-1111-1111-1111-111111111111';
