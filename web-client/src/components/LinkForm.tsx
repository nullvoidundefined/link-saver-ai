'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { api } from '@/lib/api';

interface Link {
    id: string;
    url: string;
    title: string | null;
    domain: string;
    summary_status: string;
}

interface LinkFormProps {
    onLinkCreated: (link: Link) => void;
}

export default function LinkForm({ onLinkCreated }: LinkFormProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await api.post<{ data: Link }>('/links', { url });
            onLinkCreated(res.data);
            setUrl('');
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to save link',
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                }}
            >
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste a URL to save and summarize..."
                    required
                    disabled={loading}
                    style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        fontSize: '1rem',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                    }}
                />
                <button
                    type="submit"
                    disabled={loading || !url}
                    style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        background: '#0070f3',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                    }}
                >
                    {loading ? 'Saving...' : 'Save Link'}
                </button>
            </div>
            {error && (
                <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>{error}</p>
            )}
        </form>
    );
}
