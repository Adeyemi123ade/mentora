import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../lib/api';

/**
 * Shared logout control for every dashboard (Parent/Tutor/Student/Admin). Callers keep their
 * own button classes for layout/placement — this only adds the standardized red hover state,
 * the busy spinner, and the click-guard, so the behavior stays identical everywhere logout
 * appears instead of being reimplemented per dashboard.
 */
export function LogoutButton({ className, children }: { className?: string; children: ReactNode }) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleClick() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout(navigate);
  }

  return (
    <button
      type="button"
      className={className ? `logout-btn ${className}` : 'logout-btn'}
      onClick={handleClick}
      disabled={loggingOut}
      aria-busy={loggingOut}
    >
      {loggingOut ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>Signing out…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
