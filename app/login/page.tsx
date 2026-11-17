'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        cache: 'no-store',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = '/';
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Logo / Brand */}
        <div className="login-brand">
          <span className="login-logo">GT</span>
          <div>
            <div className="login-title">GT Analytics</div>
            <div className="login-subtitle">Dashboard Access</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="off"
              autoFocus
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="new-password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="login-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="login-spinner" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      <style>{`
        .login-bg {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .login-card {
          background: var(--card);
          border-radius: 16px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.10);
          padding: 40px 36px 36px;
          width: 100%;
          max-width: 400px;
        }
        .login-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 32px;
        }
        .login-logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--orange);
          color: #fff;
          font-size: 20px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .login-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
        }
        .login-subtitle {
          font-size: 13px;
          color: var(--muted);
          margin-top: 2px;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .login-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .login-field label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }
        .login-field input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid var(--line);
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          color: var(--text);
          background: var(--bg);
          outline: none;
          transition: border-color 0.15s;
        }
        .login-field input:focus {
          border-color: var(--orange);
          background: #fff;
        }
        .login-field input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #c0362c;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 500;
        }
        .login-btn {
          width: 100%;
          padding: 11px 20px;
          background: var(--orange);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          margin-top: 4px;
        }
        .login-btn:hover:not(:disabled) {
          opacity: 0.88;
          transform: translateY(-1px);
        }
        .login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }
        .login-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

