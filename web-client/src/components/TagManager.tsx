'use client';

import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

import { api } from '@/lib/api';

export interface Tag {
    id: string;
    name: string;
    color: string | null;
}

interface TagManagerProps {
    linkId?: string | null;
    allTags: Tag[];
    linkTags: Tag[];
    onTagsChange: () => void;
    onFilterTag: (tagId: string | null) => void;
    activeFilterTag: string | null;
}

export default function TagManager({
    linkId,
    allTags,
    linkTags,
    onTagsChange,
    onFilterTag,
    activeFilterTag,
}: TagManagerProps) {
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#6366f1');
    const [creating, setCreating] = useState(false);

    const handleCreateTag = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            if (!newTagName.trim()) {
                return;
            }
            setCreating(true);
            try {
                await api.post('/tags', {
                    name: newTagName.trim(),
                    color: newTagColor,
                });
                setNewTagName('');
                onTagsChange();
            } catch {
                // ignore
            } finally {
                setCreating(false);
            }
        },
        [newTagName, newTagColor, onTagsChange],
    );

    const handleToggleTag = useCallback(
        async (tagId: string) => {
            if (!linkId) {
                return;
            }
            const isAssigned = linkTags.some((t) => t.id === tagId);
            if (isAssigned) {
                await api.del(`/links/${linkId}/tags/${tagId}`);
            } else {
                await api.post(`/links/${linkId}/tags`, { tagId });
            }
            onTagsChange();
        },
        [linkId, linkTags, onTagsChange],
    );

    const handleDeleteTag = useCallback(
        async (tagId: string) => {
            await api.del(`/tags/${tagId}`);
            if (activeFilterTag === tagId) {
                onFilterTag(null);
            }
            onTagsChange();
        },
        [activeFilterTag, onFilterTag, onTagsChange],
    );

    return (
        <div
            style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            <h3
                style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.75rem',
                }}
            >
                Tags
            </h3>

            {/* Create tag form */}
            <form
                onSubmit={handleCreateTag}
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                }}
            >
                <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    style={{
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: 'transparent',
                    }}
                />
                <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="New tag..."
                    maxLength={50}
                    style={{
                        flex: 1,
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.85rem',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                    }}
                />
                <button
                    type="submit"
                    disabled={creating || !newTagName.trim()}
                    style={{
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.85rem',
                        background: '#0070f3',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        opacity: creating ? 0.7 : 1,
                    }}
                >
                    Add
                </button>
            </form>

            {/* Tag list */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                }}
            >
                {/* "All" filter chip */}
                <button
                    onClick={() => onFilterTag(null)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        borderRadius: '999px',
                        border:
                            activeFilterTag === null
                                ? '1px solid #0070f3'
                                : '1px solid rgba(255,255,255,0.15)',
                        background:
                            activeFilterTag === null
                                ? 'rgba(0,112,243,0.15)'
                                : 'transparent',
                        color: activeFilterTag === null ? '#60a5fa' : '#999',
                        cursor: 'pointer',
                    }}
                >
                    All
                </button>
                {allTags.map((tag) => {
                    const isAssigned = linkTags.some((t) => t.id === tag.id);
                    const isFiltering = activeFilterTag === tag.id;

                    return (
                        <div
                            key={tag.id}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                            }}
                        >
                            <button
                                onClick={() =>
                                    onFilterTag(isFiltering ? null : tag.id)
                                }
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    borderRadius: '999px',
                                    border: isFiltering
                                        ? `1px solid ${tag.color || '#6366f1'}`
                                        : '1px solid rgba(255,255,255,0.15)',
                                    background: isFiltering
                                        ? `${tag.color || '#6366f1'}22`
                                        : 'transparent',
                                    color: tag.color || '#6366f1',
                                    cursor: 'pointer',
                                }}
                            >
                                <span
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: tag.color || '#6366f1',
                                    }}
                                />
                                {tag.name}
                                {isAssigned && linkId && ' ✓'}
                            </button>
                            {linkId && (
                                <button
                                    onClick={() => handleToggleTag(tag.id)}
                                    title={
                                        isAssigned
                                            ? 'Remove from link'
                                            : 'Add to link'
                                    }
                                    style={{
                                        padding: '0 0.3rem',
                                        fontSize: '0.75rem',
                                        background: 'none',
                                        border: 'none',
                                        color: isAssigned
                                            ? '#f87171'
                                            : '#4ade80',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {isAssigned ? '−' : '+'}
                                </button>
                            )}
                            <button
                                onClick={() => handleDeleteTag(tag.id)}
                                title="Delete tag"
                                style={{
                                    padding: '0 0.2rem',
                                    fontSize: '0.7rem',
                                    background: 'none',
                                    border: 'none',
                                    color: '#666',
                                    cursor: 'pointer',
                                }}
                            >
                                ×
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
