'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '../../../lib/api';
import { useAuthProvidersQuery } from '../../../lib/queries/auth';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-.8 2.3-1.8 3.1l3 2.3c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.5-.2-2.2H12Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.6 0 4.7-.8 6.3-2.3l-3-2.3c-.8.5-1.9.9-3.3.9-2.5 0-4.6-1.7-5.4-4H3.5v2.4A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#4A90E2"
        d="M6.6 14.3A6 6 0 0 1 6.3 12c0-.8.1-1.6.3-2.3V7.3H3.5A10 10 0 0 0 2.4 12c0 1.6.4 3.1 1.1 4.6l3.1-2.3Z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.7c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.7 2.9 14.6 2 12 2A10 10 0 0 0 3.5 7.3l3.1 2.4c.7-2.3 2.9-4 5.4-4Z"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const providersQuery = useAuthProvidersQuery();
  const googleEnabled = Boolean(providersQuery.data?.google);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const authError = new URLSearchParams(window.location.search).get('error');
    if (authError) {
      setError(authError);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.register(email, password, name);
      window.location.replace('/missions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="landing-shell">
      <div className="auth-shell">
        <section className="auth-panel auth-panel-dark">
          <span className="landing-kicker">Create your workspace</span>
          <h1>Set up a premium deal-hunting cockpit in minutes.</h1>
          <p>
            Start with a few searches, let the assistant sharpen your buying brief, and build a
            shortlist of the listings worth acting on.
          </p>
          <p className="auth-panel-switch">
            Already have an account?{' '}
            <Link href="/login" className="auth-panel-link">
              Sign in
            </Link>
          </p>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Create account</p>
                <h2>Start tracking better deals</h2>
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            {googleEnabled && (
              <>
                <a
                  href={api.auth.googleStart('/missions')}
                  className="btn-primary auth-submit auth-google-btn"
                >
                  <GoogleIcon />
                  Continue with Google
                </a>
                <div className="auth-divider">
                  <span>or create an account with email</span>
                </div>
              </>
            )}

            <form onSubmit={onSubmit} className="auth-form">
              <div className="input-stack">
                <label htmlFor="name" className="label">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="input-stack">
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-stack">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`${googleEnabled ? 'btn-secondary' : 'btn-primary'} auth-submit`}
              >
                {loading ? 'Creating account…' : 'Continue with email'}
              </button>
            </form>

            <p className="auth-footer">
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
