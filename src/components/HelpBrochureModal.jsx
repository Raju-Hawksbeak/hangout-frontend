import React, { useState } from 'react';
import { LANGUAGES } from '../i18n';
import { getGuideForLang } from '../data/thekGuideContent';

export default function HelpBrochureModal({
  isOpen,
  onClose,
  lang,
  onChangeLang,
  initialTab = 'brochure'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  const content = getGuideForLang(lang);

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>{content.badge}</div>
            <h2 style={styles.title}>{content.title}</h2>
            <p style={styles.subtitle}>{content.subtitle}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onChangeLang && (
              <select
                aria-label="Guide Language"
                value={lang}
                onChange={(e) => onChangeLang(e.target.value)}
                style={styles.langSelect}
              >
                {LANGUAGES.map((item) => (
                  <option
                    key={item.code}
                    value={item.code}
                    style={{ background: '#0b0e14', color: '#f8fafc' }}
                  >
                    🌐 {item.short}
                  </option>
                ))}
              </select>
            )}
            <button type="button" onClick={onClose} style={styles.closeIconBtn} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={styles.tabBar}>
          <button
            type="button"
            onClick={() => setActiveTab('brochure')}
            style={{
              ...styles.tabBtn,
              background: activeTab === 'brochure' ? '#00e676' : 'rgba(30, 41, 59, 0.7)',
              color: activeTab === 'brochure' ? '#051b11' : '#cbd5e1',
              borderColor: activeTab === 'brochure' ? '#00e676' : '#334155'
            }}
          >
            {content.tabs.brochure}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            style={{
              ...styles.tabBtn,
              background: activeTab === 'manual' ? '#38bdf8' : 'rgba(30, 41, 59, 0.7)',
              color: activeTab === 'manual' ? '#082f49' : '#cbd5e1',
              borderColor: activeTab === 'manual' ? '#38bdf8' : '#334155'
            }}
          >
            {content.tabs.manual}
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {activeTab === 'brochure' ? (
            <>
              <div style={styles.taglineBox}>{content.brochure.tagline}</div>
              {content.brochure.sections.map((sec, idx) => (
                <div key={idx} style={styles.card}>
                  <div style={styles.cardHeading}>{sec.heading}</div>
                  {sec.body && <p style={styles.cardText}>{sec.body}</p>}
                  {sec.items && (
                    <ul style={styles.list}>
                      {sec.items.map((item, i) => (
                        <li key={i} style={styles.listItem}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {content.manual.steps.map((s, idx) => (
                <div key={idx} style={styles.card}>
                  <div style={{ ...styles.cardHeading, color: '#7dd3fc' }}>{s.step}</div>
                  <p style={styles.cardText}>{s.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button type="button" onClick={onClose} style={styles.primaryBtn}>
            {content.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5, 8, 15, 0.78)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 95,
    padding: '14px'
  },
  modal: {
    width: '100%',
    maxWidth: '620px',
    maxHeight: '86dvh',
    background: '#111622',
    border: '1px solid #2d3748',
    borderRadius: '18px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)'
  },
  header: {
    padding: '16px 18px 12px 18px',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '10px'
  },
  badge: {
    display: 'inline-block',
    fontSize: '9.5px',
    fontWeight: '800',
    letterSpacing: '0.6px',
    color: '#00e676',
    background: 'rgba(0, 230, 118, 0.12)',
    border: '1px solid rgba(0, 230, 118, 0.35)',
    padding: '2px 8px',
    borderRadius: '999px',
    marginBottom: '5px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '900',
    color: '#f8fafc'
  },
  subtitle: {
    margin: '3px 0 0 0',
    fontSize: '12px',
    color: '#94a3b8'
  },
  langSelect: {
    background: '#0b0e14',
    border: '1px solid #334155',
    color: '#00e676',
    fontSize: '11px',
    fontWeight: '700',
    padding: '5px 8px',
    borderRadius: '999px',
    outline: 'none',
    cursor: 'pointer'
  },
  closeIconBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    fontSize: '12px',
    cursor: 'pointer',
    flexShrink: 0
  },
  tabBar: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    padding: '10px 18px',
    background: '#0b0e14',
    borderBottom: '1px solid #1e293b'
  },
  tabBtn: {
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '12.5px',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  body: {
    padding: '14px 18px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  taglineBox: {
    background: 'linear-gradient(90deg, rgba(0, 230, 118, 0.12), rgba(56, 189, 248, 0.12))',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center'
  },
  card: {
    background: '#0b0e14',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '12px 14px'
  },
  cardHeading: {
    fontSize: '13.5px',
    fontWeight: '800',
    color: '#6ee7b7',
    marginBottom: '6px'
  },
  cardText: {
    margin: 0,
    fontSize: '12.5px',
    color: '#cbd5e1',
    lineHeight: '1.55'
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  listItem: {
    fontSize: '12.5px',
    color: '#cbd5e1',
    lineHeight: '1.5'
  },
  footer: {
    padding: '12px 18px',
    borderTop: '1px solid #1e293b',
    display: 'flex',
    justifyContent: 'flex-end',
    background: '#0b0e14'
  },
  primaryBtn: {
    background: '#00e676',
    border: 'none',
    color: '#051b11',
    fontWeight: '800',
    fontSize: '13px',
    padding: '9px 18px',
    borderRadius: '999px',
    cursor: 'pointer'
  }
};
