'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import type { Tag } from '@/components/TagManager';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

import styles from './account.module.scss';

interface LinksResponse {
    data: unknown[];
    meta: { total: number };
}

interface TagsResponse {
    data: Tag[];
}

function formatMemberSince(dateStr: string | undefined): string {
    if (!dateStr) {
        return 'Unknown';
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return 'Unknown';
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getInitial(email: string): string {
    return email.charAt(0).toUpperCase();
}

export default function AccountPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    const { data: linksData, isLoading: linksLoading } = useQuery({
        queryKey: ['links', 'account'],
        queryFn: () => api.get<LinksResponse>('/links'),
        enabled: !!user,
    });

    const { data: tagsData, isLoading: tagsLoading } = useQuery({
        queryKey: ['tags', 'account'],
        queryFn: () => api.get<TagsResponse>('/tags'),
        enabled: !!user,
    });

    const handleLogout = useCallback(async () => {
        await logout();
        router.push('/');
    }, [logout, router]);

    const handleBack = useCallback(() => {
        router.push('/');
    }, [router]);

    if (loading) {
        return (
            <div className={styles.page}>
                <p className={styles.loading}>Loading...</p>
            </div>
        );
    }

    if (!user) {
        router.push('/');
        return null;
    }

    const totalLinks = linksData?.meta?.total ?? linksData?.data?.length ?? 0;
    const tags = tagsData?.data ?? [];

    return (
        <div className={styles.page}>
            <button className={styles.backLink} onClick={handleBack}>
                &larr; Back to dashboard
            </button>

            <h1 className={styles.title}>Account</h1>

            {/* Profile section */}
            <div className={styles.card}>
                <p className={styles.sectionLabel}>Profile</p>
                <div className={styles.profileRow}>
                    <div className={styles.avatar}>
                        {getInitial(user.email)}
                    </div>
                    <div className={styles.profileInfo}>
                        <span className={styles.email}>{user.email}</span>
                        <span className={styles.memberSince}>
                            Member since{' '}
                            {formatMemberSince(
                                (user as unknown as { created_at?: string })
                                    .created_at,
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats section */}
            <div className={styles.card}>
                <p className={styles.sectionLabel}>Usage Stats</p>
                <div className={styles.statsGrid}>
                    <div className={styles.statBox}>
                        <div className={styles.statValue}>
                            {linksLoading ? '—' : totalLinks}
                        </div>
                        <div className={styles.statLabel}>Links saved</div>
                    </div>
                    <div className={styles.statBox}>
                        <div className={styles.statValue}>
                            {tagsLoading ? '—' : tags.length}
                        </div>
                        <div className={styles.statLabel}>Tags created</div>
                    </div>
                </div>

                {tagsLoading ? (
                    <p className={styles.loading}>Loading tags...</p>
                ) : tags.length > 0 ? (
                    <div className={styles.tagList}>
                        {tags.map((tag) => (
                            <span
                                key={tag.id}
                                className={styles.tagChip}
                                style={{
                                    background: `${tag.color || '#6366f1'}22`,
                                    color: tag.color || '#6366f1',
                                }}
                            >
                                <span
                                    className={styles.tagDot}
                                    style={{
                                        background: tag.color || '#6366f1',
                                    }}
                                />
                                {tag.name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className={styles.emptyTags}>No tags created yet.</p>
                )}
            </div>

            {/* Session / Danger zone */}
            <div className={styles.card}>
                <p className={styles.sectionLabel}>Session</p>
                <p className={styles.dangerDescription}>
                    You will be signed out of your current session.
                </p>
                <button className={styles.logoutButton} onClick={handleLogout}>
                    Sign Out
                </button>
            </div>
        </div>
    );
}
