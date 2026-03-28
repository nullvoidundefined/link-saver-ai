'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '@/lib/auth';

export default function AuthForm() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '4rem auto',
        padding: '2rem',
      }}
    >
      <h1 style={{ marginBottom: '1.5rem' }}>
        {isRegister ? 'Create Account' : 'Sign In'}
      </h1>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='Email'
          required
          style={{
            padding: '0.75rem',
            border: '1px solid #333',
            borderRadius: '8px',
            background: 'var(--background)',
            color: 'var(--foreground)',
          }}
        />
        <input
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='Password'
          required
          minLength={8}
          style={{
            padding: '0.75rem',
            border: '1px solid #333',
            borderRadius: '8px',
            background: 'var(--background)',
            color: 'var(--foreground)',
          }}
        />
        <button
          type='submit'
          disabled={loading}
          style={{
            padding: '0.75rem',
            background: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Loading...' : isRegister ? 'Register' : 'Sign In'}
        </button>
      </form>
      {error && (
        <p style={{ color: '#ef4444', marginTop: '0.75rem' }}>{error}</p>
      )}
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button
          onClick={() => setIsRegister(!isRegister)}
          style={{
            background: 'none',
            border: 'none',
            color: '#0070f3',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {isRegister
            ? 'Already have an account? Sign in'
            : "Don't have an account? Register"}
        </button>
      </p>
    </div>
  );
}
