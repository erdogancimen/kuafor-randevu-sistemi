import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kuaför Randevu Sistemi',
  description: 'En iyi kuaförleri keşfedin, kolayca randevu alın.',
  keywords: ['kuaför', 'randevu', 'saç kesimi', 'berber', 'güzellik salonu'],
  authors: [{ name: 'Kuaför Randevu Sistemi' }],
  creator: 'Kuaför Randevu Sistemi',
  publisher: 'Kuaför Randevu Sistemi',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://kuafor-randevu.vercel.app',
    title: 'Kuaför Randevu Sistemi',
    description: 'En iyi kuaförleri keşfedin, kolayca randevu alın.',
    siteName: 'Kuaför Randevu Sistemi',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kuaför Randevu Sistemi',
    description: 'En iyi kuaförleri keşfedin, kolayca randevu alın.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
        {children}
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
