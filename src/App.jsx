import React, { useState } from 'react';
import AuthScreen from './components/AuthScreen';
import CanvasRoom from './components/CanvasRoom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || 'Unexpected render error' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ color: '#fb7185', marginBottom: '8px' }}>Thek Screen Error</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '360px', marginBottom: '16px' }}>{this.state.errorMsg}</p>
          <button
            onClick={() => {
              localStorage.removeItem('thek_session');
              window.location.reload();
            }}
            style={{ background: '#00e676', color: '#051b11', border: 'none', padding: '10px 18px', borderRadius: '999px', fontWeight: '800', cursor: 'pointer' }}
          >
            Reset Session & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem('thek_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleAuthSuccess = (authData) => {
    const safeUser = authData?.user || {
      id: authData?.token || 'guest',
      username: (authData?.email || 'member').split('@')[0]
    };
    const cleanSession = {
      token: authData?.token || safeUser.id,
      user: safeUser,
      inviteCodes: Array.isArray(authData?.inviteCodes) ? authData.inviteCodes : []
    };
    setSession(cleanSession);
    localStorage.setItem('thek_session', JSON.stringify(cleanSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('thek_session');
  };

  return (
    <ErrorBoundary>
      {!session || !session.token ? (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      ) : (
        <CanvasRoom
          user={session.user || { id: session.token, username: 'Member' }}
          token={session.token}
          inviteCodes={session.inviteCodes || []}
          onLogout={handleLogout}
        />
      )}
    </ErrorBoundary>
  );
}
