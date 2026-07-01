import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import './NotificationCenter.css';

const DURATION = 4000; // ms before auto-dismiss

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`nc-toast nc-toast-${toast.type}`} role="alert">
      <span className="nc-toast-icon">{toast.icon}</span>
      <span className="nc-toast-msg">{toast.msg}</span>
      <button className="nc-toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">✕</button>
      <div className="nc-toast-progress" style={{ animationDuration: `${DURATION}ms` }} />
    </div>
  );
}

export default function NotificationCenter({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="nc-container" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

NotificationCenter.propTypes = {
  toasts:    PropTypes.array.isRequired,
  onDismiss: PropTypes.func.isRequired,
};
