import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

export default function AuthScreen({ onAuthSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isSignup ? '/auth/signup' : '/auth/login';
      const payload = isSignup
        ? { username: username.trim(), email: email.trim(), password, invite_code: inviteCode.trim() }
        : { email: email.trim(), password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      onAuthSuccess({
        token: data.access_token,
        user: data.user,
        inviteCodes: data.new_invite_codes || []
      });
    } catch (err) {
      setError(err.message || 'Server wake-up in progress. Please try again in 5 seconds.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>ZERO-ALGORITHM • LIVE VOICE JAM</div>
        <h1 style={styles.title}>Project Hangout</h1>
        <p style={styles.subtitle}>
          {isSignup
            ? 'Enter your invite code to claim your space and get 3 codes for friends.'
            : 'Welcome back to the live jam room.'}
        </p>

        <div style={styles.tabRow}>
          <button
            type="button"
            onClick={() => { setIsSignup(false); setError(''); }}
            style={{ ...styles.tabBtn, ...(isSignup ? {} : styles.tabActive) }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsSignup(true); setError(''); }}
            style={{ ...styles.tabBtn, ...(isSignup ? styles.tabActive : {}) }}
          >
            Invite Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignup && (
            <input
              type="text"
              placeholder="Username (e.g. rahul_jam)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              style={styles.input}
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={styles.input}
          />

          {isSignup && (
            <input
              type="text"
              placeholder="Invite Code (e.g. HANG-XXXXXX)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              style={{ ...styles.input, letterSpacing: '1px', fontWeight: 'bold' }}
            />
          )}

          {error && <div style={styles.errorBox}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Connecting to Server...' : isSignup ? 'Create Account & Enter' : 'Enter Live Room'}
          </button>
        </form>

        <p style={styles.hint}>
          Note: Free server may take ~20–30s to wake up on the very first request.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at top, #172033 0%, #0b0e14 70%)',
    padding: '16px'
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#131822',
    border: '1px solid #263042',
    borderRadius: '20px',
    padding: '28px 24px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
  },
  badge: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '1px',
    color: '#00e676',
    background: 'rgba(0, 230, 118, 0.12)',
    padding: '4px 10px',
    borderRadius: '999px',
    marginBottom: '12px'
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: '6px'
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '20px',
    lineHeight: '1.4'
  },
  tabRow: {
    display: 'flex',
    background: '#0b0e14',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '18px'
  },
  tabBtn: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '9px',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  tabActive: {
    background: '#1e293b',
    color: '#ffffff'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #2d3748',
    background: '#0d1117',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none'
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    fontSize: '12px',
    padding: '10px 12px',
    borderRadius: '10px'
  },
  submitBtn: {
    marginTop: '4px',
    padding: '13px',
    borderRadius: '12px',
    border: 'none',
    background: '#00e676',
    color: '#051b11',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer'
  },
  hint: {
    marginTop: '14px',
    fontSize: '11px',
    color: '#64748b',
    textAlign: 'center'
  }
};
