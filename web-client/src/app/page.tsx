'use client';

import { useCallback, useEffect, useState } from 'react';

import AuthForm from '@/components/AuthForm';
import LinkForm from '@/components/LinkForm';
import StreamingSummary from '@/components/StreamingSummary';
import TagManager from '@/components/TagManager';
import type { Tag } from '@/components/TagManager';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Link {
  id: string;
  url: string;
  url_hash: string;
  title: string | null;
  domain: string | null;
  summary: string | null;
  summary_status: string;
  created_at: string;
}

const statusBadge: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pending', bg: '#3f3f46', fg: '#a1a1aa' },
  streaming: { label: 'Streaming', bg: '#1e3a5f', fg: '#60a5fa' },
  complete: { label: 'Complete', bg: '#14532d', fg: '#4ade80' },
  failed: { label: 'Failed', bg: '#450a0a', fg: '#f87171' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [linkTags, setLinkTags] = useState<Tag[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Map of linkId -> Tag[] for showing tag chips in the list
  const [linkTagMap, setLinkTagMap] = useState<Record<string, Tag[]>>({});

  const fetchLinks = useCallback(async (q?: string) => {
    try {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await api.get<{ data: Link[] }>(`/links${qs}`);
      setLinks(res.data);
    } catch {
      // not logged in or error
    }
  }, []);

  const fetchAllTags = useCallback(async () => {
    try {
      const res = await api.get<{ data: Tag[] }>('/tags');
      setAllTags(res.data);
    } catch {
      // ignore
    }
  }, []);

  const fetchLinkTags = useCallback(async (linkId: string) => {
    try {
      const res = await api.get<{ data: Tag[] }>(`/links/${linkId}/tags`);
      setLinkTags(res.data);
      setLinkTagMap((prev) => ({ ...prev, [linkId]: res.data }));
    } catch {
      setLinkTags([]);
    }
  }, []);

  const fetchAllLinkTags = useCallback(async (linkList: Link[]) => {
    const map: Record<string, Tag[]> = {};
    await Promise.all(
      linkList.map(async (link) => {
        try {
          const res = await api.get<{ data: Tag[] }>(`/links/${link.id}/tags`);
          map[link.id] = res.data;
        } catch {
          map[link.id] = [];
        }
      }),
    );
    setLinkTagMap(map);
  }, []);

  useEffect(() => {
    if (user) {
      fetchLinks();
      fetchAllTags();
    }
  }, [user, fetchLinks, fetchAllTags]);

  // When links change, fetch tags for all of them
  useEffect(() => {
    if (links.length > 0) {
      fetchAllLinkTags(links);
    }
  }, [links, fetchAllLinkTags]);

  // When selected link changes, fetch its tags
  useEffect(() => {
    if (selectedLink) {
      fetchLinkTags(selectedLink.id);
    } else {
      setLinkTags([]);
    }
  }, [selectedLink, fetchLinkTags]);

  const handleTagsChange = useCallback(() => {
    fetchAllTags();
    if (selectedLink) {
      fetchLinkTags(selectedLink.id);
    }
  }, [fetchAllTags, fetchLinkTags, selectedLink]);

  const handleDelete = useCallback(
    async (linkId: string) => {
      await api.del(`/links/${linkId}`);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      if (selectedLink?.id === linkId) {
        setSelectedLink(null);
      }
    },
    [selectedLink],
  );

  // Filter links by tag
  const filteredLinks = filterTag
    ? links.filter((link) =>
        (linkTagMap[link.id] || []).some((t) => t.id === filterTag),
      )
    : links;

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Link Saver AI</h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#888' }}>
            {user.email}
          </span>
          <button
            onClick={logout}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.85rem',
              background: 'none',
              border: '1px solid #333',
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

      <TagManager
        linkId={selectedLink?.id ?? null}
        allTags={allTags}
        linkTags={linkTags}
        onTagsChange={handleTagsChange}
        onFilterTag={setFilterTag}
        activeFilterTag={filterTag}
      />

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Sidebar: link list */}
        <div style={{ width: '380px', flexShrink: 0 }}>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Saved Links ({filteredLinks.length})
          </h2>
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchLinks(e.target.value || undefined);
            }}
            placeholder='Search by title, domain, or tag...'
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              fontSize: '0.85rem',
              border: '1px solid #333',
              borderRadius: '8px',
              background: 'var(--background)',
              color: 'var(--foreground)',
              marginBottom: '0.75rem',
            }}
          />
          {filteredLinks.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              {filterTag
                ? 'No links match this tag filter.'
                : 'No links saved yet. Paste a URL above to get started.'}
            </p>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                maxHeight: 'calc(100vh - 380px)',
                overflowY: 'auto',
              }}
            >
              {filteredLinks.map((link) => {
                const isSelected = selectedLink?.id === link.id;
                const badge =
                  statusBadge[link.summary_status] ?? statusBadge.pending;
                const tags = linkTagMap[link.id] || [];

                return (
                  <li
                    key={link.id}
                    onClick={() => setSelectedLink(link)}
                    style={{
                      padding: '0.75rem 1rem',
                      marginBottom: '0.5rem',
                      border: isSelected
                        ? '1px solid #0070f3'
                        : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected
                        ? 'rgba(0,112,243,0.08)'
                        : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: '0.95rem',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {link.title || link.url}
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: badge.bg,
                          color: badge.fg,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.35rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: '#666',
                        }}
                      >
                        {link.domain}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#555',
                        }}
                      >
                        {timeAgo(link.created_at)}
                      </span>
                    </div>

                    {tags.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.3rem',
                          marginTop: '0.35rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        {tags.map((tag) => (
                          <span
                            key={tag.id}
                            style={{
                              fontSize: '0.68rem',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              background: `${tag.color || '#6366f1'}22`,
                              color: tag.color || '#6366f1',
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {link.summary && (
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: '#999',
                          marginTop: '0.4rem',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {link.summary}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Main content: selected link detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedLink ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  marginBottom: '0.5rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  {selectedLink.title || 'Untitled'}
                </h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(selectedLink.id);
                  }}
                  title='Delete link'
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.8rem',
                    background: 'none',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    color: '#f87171',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Delete
                </button>
              </div>
              <a
                href={selectedLink.url}
                target='_blank'
                rel='noopener noreferrer'
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
                onComplete={(summary) => {
                  setLinks((prev) =>
                    prev.map((l) =>
                      l.id === selectedLink.id
                        ? { ...l, summary, summary_status: 'complete' }
                        : l,
                    ),
                  );
                  setSelectedLink((prev) =>
                    prev?.id === selectedLink.id
                      ? { ...prev, summary, summary_status: 'complete' }
                      : prev,
                  );
                }}
              />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#555',
                fontSize: '0.95rem',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '12px',
              }}
            >
              Select a link to view its summary
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <Dashboard />;
}
