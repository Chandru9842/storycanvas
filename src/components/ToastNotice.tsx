import React from 'react';
import { Info, X } from 'lucide-react';

interface ToastNoticeProps {
  message: string | null;
  onDismiss: () => void;
}

export const ToastNotice: React.FC<ToastNoticeProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '88px',
        right: '24px',
        zIndex: 1500,
        maxWidth: '380px',
        background: 'rgba(24, 30, 39, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-amber)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        boxShadow: 'var(--shadow-lg), 0 0 24px rgba(224, 159, 62, 0.25)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'fadeIn 250ms ease-out',
      }}
    >
      <Info size={18} style={{ color: 'var(--amber-primary)', flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
        {message}
      </div>
      <button
        onClick={onDismiss}
        style={{ color: 'var(--text-muted)', padding: 2, borderRadius: 4 }}
        aria-label="Dismiss message"
      >
        <X size={14} />
      </button>
    </div>
  );
};
