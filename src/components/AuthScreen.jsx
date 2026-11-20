import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { LANGUAGES, TRANSLATIONS, getInitialLang } from '../i18n';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function checkPasswordRules(pw) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw)
  };
}

export default function AuthScreen({ onAuthSuccess }) {
  const [lang, setLang] = useState(getInitialLang);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const googleBtnRef = useRef(null);

  const changeLanguage = (code) => {
    setLang(code);
    localStorage.setItem('thek_lang', code);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlInvite = params.get('invite');
    if (urlInvite) {
      setInviteCode(urlInvite.trim().toUpperCase());
      setMode('signup');
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || mode === 'forgot') return;

    const initGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response.credential) return;
            setError('');
            setLoading(true);
            try {
              const res = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id_token: response.credential,
                  invite_code: inviteCode.trim() || null
                })
              });
              const data = await res.json();
              if (!res.ok) {
                if (String(data.detail || '').includes('INVITE_REQUIRED')) {
                  setMode('signup');
                  throw new Error('New to Thek? Enter your Invite Code above first, then tap Google!');
                }
                throw new Error(data.detail || 'Google sign-in failed');
              }
              if (window.location.search) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
              onAuthSuccess({
                token: data.token,
                user: data.user,
                inviteCodes: data.invites || []
              });
            } catch (err) {
              setError(err.message);
            } finally {
              setLoading(false);
            }
          }
        });
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: 320
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    }
  }, [mode, inviteCode]);

  const rules = checkPasswordRules(password);
  const isPasswordStrong = rules.length && rules.upper && rules.lower && rules.number;

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccessMsg('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode !== 'login' && !isPasswordStrong) {
      setError('Please meet all password strength requirements (8+ chars, A-Z, a-z, 0-9).');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'forgot') {
        const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            recovery_key: recoveryKey.trim(),
            new_password: password,
            new_recovery_pin: recoveryPin.trim() || null
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Password reset failed');
        }
        setSuccessMsg(data.message || 'Password reset! Please log in with your new password.');
        setMode('login');
        setPassword('');
        return;
      }

      const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
      const payload =
        mode === 'signup'
          ? {
              username: username.trim(),
              email: email.trim(),
              password,
              invite_code: inviteCode.trim(),
              recovery_pin: recoveryPin.trim() || null
            }
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

      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      onAuthSuccess({
        token: data.token || data.access_token,
        user: data.user,
        inviteCodes: data.invites || data.new_invite_codes || []
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
        {/* Top Row: Badge + Clean 22-Language Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={styles.badge}>{t.badge}</div>
          <select
            aria-label="Select language"
            value={lang}
            onChange={(e) => changeLanguage(e.target.value)}
            style={styles.langSelect}
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code} style={{ background: '#0b0e14', color: '#f8fafc' }}>
                🌐 {item.label}
              </option>
            ))}
          </select>
        </div>

        <h1 style={styles.title}>Thek</h1>
        <p style={styles.subtitle}>
          {mode === 'signup'
            ? t.taglineSignup
            : mode === 'forgot'
            ? t.taglineForgot
            : t.taglineLogin}
        </p>

        <div style={styles.tabRow}>
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{ ...styles.tabBtn, ...(mode === 'login' ? styles.tabActive : {}) }}
          >
            {t.loginTab}
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            style={{ ...styles.tabBtn, ...(mode === 'signup' ? styles.tabActive : {}) }}
          >
            {t.signupTab}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder={t.usernamePlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              style={styles.input}
            />
          )}

          <input
            type={mode === 'signup' ? 'email' : 'text'}
            placeholder={mode === 'signup' ? t.emailPlaceholder : t.emailOrUserPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          {mode === 'forgot' && (
            <input
              type="text"
              placeholder={t.recoveryKeyPlaceholder}
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              required
              style={styles.input}
            />
          )}

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'forgot' ? t.newPasswordPlaceholder : t.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ ...styles.input, paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>

          {mode !== 'login' && (
            <div style={styles.policyBox}>
              <div style={{ color: rules.length ? '#00e676' : '#94a3b8' }}>
                {rules.length ? '✓' : '•'} 8+ chars
              </div>
              <div style={{ color: rules.upper ? '#00e676' : '#94a3b8' }}>
                {rules.upper ? '✓' : '•'} 1 Uppercase (A–Z)
              </div>
              <div style={{ color: rules.lower ? '#00e676' : '#94a3b8' }}>
                {rules.lower ? '✓' : '•'} 1 Lowercase (a–z)
              </div>
              <div style={{ color: rules.number ? '#00e676' : '#94a3b8' }}>
                {rules.number ? '✓' : '•'} 1 Number (0–9)
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder={t.invitePlaceholder}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                style={{ ...styles.input, letterSpacing: '1px', fontWeight: 'bold' }}
              />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={t.pinPlaceholder}
                value={recoveryPin}
                onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
                required
                style={styles.input}
              />
            </>
          )}

          {mode === 'forgot' && (
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={t.pinPlaceholder}
              value={recoveryPin}
              onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
              style={styles.input}
            />
          )}

          {error && <div style={styles.errorBox}>{error}</div>}
          {successMsg && <div style={styles.successBox}>{successMsg}</div>}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading
              ? '...'
              : mode === 'signup'
              ? t.joinBtn
              : mode === 'forgot'
              ? t.resetBtn
              : t.enterBtn}
          </button>
        </form>

        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          {mode === 'login' ? (
            <button type="button" onClick={() => switchMode('forgot')} style={styles.linkBtn}>
              {t.forgotLink}
            </button>
          ) : (
            <button type="button" onClick={() => switchMode('login')} style={styles.linkBtn}>
              {t.backLoginLink}
            </button>
          )}
        </div>

        {GOOGLE_CLIENT_ID && mode !== 'forgot' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>— OR —</div>
            <div ref={googleBtnRef} />
          </div>
        )}

        <p style={styles.hint}>{t.footerHint}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at top, #172033 0%, #0b0e14 70%)',
    padding: '16px',
    boxSizing: 'border-box'
  },
  card: {
    width: '100%',
    maxWidth: '410px',
    background: '#131822',
    border: '1px solid #263042',
    borderRadius: '20px',
    padding: '22px 20px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
  },
  badge: {
    display: 'inline-block',
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.6px',
    color: '#00e676',
    background: 'rgba(0, 230, 118, 0.12)',
    padding: '4px 8px',
    borderRadius: '999px'
  },
  langSelect: {
    background: '#0b0e14',
    border: '1px solid #334155',
    color: '#00e676',
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '999px',
    outline: 'none',
    cursor: 'pointer',
    maxWidth: '135px'
  },
  title: {
    fontSize: '30px',
    fontWeight: '900',
    color: '#ffffff',
    margin: '0 0 6px 0',
    letterSpacing: '-0.8px'
  },
  subtitle: {
    fontSize: '12.5px',
    color: '#94a3b8',
    margin: '0 0 16px 0',
    lineHeight: '1.45'
  },
  tabRow: {
    display: 'flex',
    background: '#0b0e14',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '14px'
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
    gap: '10px'
  },
  input: {
    width: '100%',
    padding: '11px 13px',
    borderRadius: '11px',
    border: '1px solid #2d3748',
    background: '#0d1117',
    color: '#f8fafc',
    fontSize: '13.5px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '15px'
  },
  policyBox: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px 8px',
    background: '#0b0e14',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: '600'
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    fontSize: '12px',
    padding: '9px 11px',
    borderRadius: '10px'
  },
  successBox: {
    background: 'rgba(0, 230, 118, 0.15)',
    border: '1px solid rgba(0, 230, 118, 0.4)',
    color: '#6ee7b7',
    fontSize: '12px',
    padding: '9px 11px',
    borderRadius: '10px'
  },
  submitBtn: {
    marginTop: '4px',
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    background: '#00e676',
    color: '#051b11',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer'
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#38bdf8',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  hint: {
    marginTop: '14px',
    fontSize: '11px',
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic'
  }
};
