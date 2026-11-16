import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import CanvasRoom from './components/CanvasRoom';

const STORAGE_KEY = 'hangout_session_v1';

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  if (!session || !session.user) {
    return <AuthScreen onAuthSuccess={(authData) => setSession(authData)} />;
  }

  return (
    <CanvasRoom
      user={session.user}
      token={session.token}
      inviteCodes={session.inviteCodes || []}
      onLogout={() => setSession(null)}
    />
  );
}
