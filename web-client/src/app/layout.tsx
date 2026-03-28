import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { AuthProvider } from '@/lib/auth';
import { QueryProvider } from '@/providers/QueryProvider';

import './globals.scss';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Link Saver AI',
    description: 'Save links and get AI-powered summaries in real time',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable}`}>
                <QueryProvider>
                    <AuthProvider>{children}</AuthProvider>
                </QueryProvider>
                <Analytics />
            </body>
        </html>
    );
}
