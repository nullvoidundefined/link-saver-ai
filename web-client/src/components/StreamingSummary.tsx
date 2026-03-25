'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getSSEUrl } from '@/lib/api';

interface StreamingSummaryProps {
    linkId: string;
    existingSummary?: string | null;
    summaryStatus?: string;
}

type Status = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

export default function StreamingSummary({
    linkId,
    existingSummary,
    summaryStatus,
}: StreamingSummaryProps) {
    const [text, setText] = useState(existingSummary || '');
    const [status, setStatus] = useState<Status>(
        summaryStatus === 'complete' ? 'complete' : 'idle',
    );
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const startStreaming = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setText('');
        setError(null);
        setStatus('connecting');

        const url = getSSEUrl(`/links/${linkId}/summary`);
        const es = new EventSource(url, { withCredentials: true });
        eventSourceRef.current = es;

        es.onopen = () => {
            setStatus('streaming');
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as {
                    type: string;
                    token?: string;
                    summary?: string;
                    message?: string;
                };

                if (data.type === 'token' && data.token) {
                    setText((prev) => prev + data.token);
                } else if (data.type === 'done') {
                    setStatus('complete');
                    es.close();
                } else if (data.type === 'error') {
                    setError(data.message || 'Summary generation failed');
                    setStatus('error');
                    es.close();
                }
            } catch {
                // ignore parse errors
            }
        };

        es.onerror = () => {
            if (status !== 'complete') {
                setError('Connection lost');
                setStatus('error');
            }
            es.close();
        };
    }, [linkId, status]);

    useEffect(() => {
        return () => {
            eventSourceRef.current?.close();
        };
    }, []);

    const statusColors: Record<Status, string> = {
        idle: '#888',
        connecting: '#f59e0b',
        streaming: '#3b82f6',
        complete: '#22c55e',
        error: '#ef4444',
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                }}
            >
                <span
                    style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: statusColors[status],
                    }}
                />
                <span
                    style={{
                        fontSize: '0.85rem',
                        color: statusColors[status],
                        textTransform: 'capitalize',
                    }}
                >
                    {status}
                </span>
                {(status === 'idle' || status === 'error') && (
                    <button
                        onClick={startStreaming}
                        style={{
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.85rem',
                            background: '#0070f3',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        {status === 'error' ? 'Retry' : 'Generate Summary'}
                    </button>
                )}
            </div>

            {error && (
                <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</p>
            )}

            {text && (
                <div
                    style={{
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {text}
                    {status === 'streaming' && (
                        <span
                            style={{
                                display: 'inline-block',
                                width: '2px',
                                height: '1em',
                                background: '#0070f3',
                                marginLeft: '2px',
                                animation: 'blink 1s infinite',
                                verticalAlign: 'text-bottom',
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
