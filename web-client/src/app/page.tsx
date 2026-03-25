'use client';

import { useCallback, useEffect, useState } from 'react';

import AuthForm from '@/components/AuthForm';
import LinkForm from '@/components/LinkForm';
import StreamingSummary from '@/components/StreamingSummary';
import { api } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';

interface Link {
    id: string;
    url: string;
    title: string | null;
    domain: string;
    summary: string | null;
    summary_status: string;
    created_at: string;
}

function Dashboard() {
    const { user, loading, logout } = useAuth();
    const [links, setLinks] = useState<Link[]>([]);
    const [selectedLink, setSelectedLink] = useState<Link | null>(null);

    const fetchLinks = useCallback(async () => {
        try {
            const res = await api.get<{ data: Link[] }>('/links');
            setLinks(res.data);
        } catch {
            // not logged in or error
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchLinks();
        }
    }, [user, fetchLinks]);

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return <AuthForm />;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <header
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem',
                }}
            >
                <h1>Link Saver AI</h1>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                    }}
                >
                    <span style={{ fontSize: '0.9rem', color: '#888' }}>
                        {user.email}
                    </span>
                    <button
                        onClick={logout}
                        style={{
                            padding: '0.4rem 0.8rem',
                            background: 'none',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            <LinkForm
                onLinkCreated={(link) => {
                    const newLink = link as unknown as Link;
                    setLinks((prev) => [newLink, ...prev]);
                    setSelectedLink(newLink);
                }}
            />

            <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                    <h2 style={{ marginBottom: '1rem' }}>Saved Links</h2>
                    {links.length === 0 ? (
                        <p style={{ color: '#888' }}>
                            No links saved yet. Paste a URL above to get
                            started.
                        </p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {links.map((link) => (
                                <li
                                    key={link.id}
                                    onClick={() => setSelectedLink(link)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        marginBottom: '0.5rem',
                                        border:
                                            selectedLink?.id === link.id
                                                ? '1px solid #0070f3'
                                                : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        background:
                                            selectedLink?.id === link.id
                                                ? 'rgba(0,112,243,0.1)'
                                                : 'transparent',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 500,
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        {link.title || link.url}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.8rem',
                                            color: '#888',
                                        }}
                                    >
                                        {link.domain}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {selectedLink && (
                    <div style={{ flex: 1 }}>
                        <h2 style={{ marginBottom: '0.5rem' }}>
                            {selectedLink.title || 'Untitled'}
                        </h2>
                        <a
                            href={selectedLink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: '#0070f3',
                                fontSize: '0.85rem',
                                wordBreak: 'break-all',
                            }}
                        >
                            {selectedLink.url}
                        </a>
                        <StreamingSummary
                            key={selectedLink.id}
                            linkId={selectedLink.id}
                            existingSummary={selectedLink.summary}
                            summaryStatus={selectedLink.summary_status}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Home() {
    return (
        <AuthProvider>
            <Dashboard />
        </AuthProvider>
    );
}
