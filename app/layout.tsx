import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/contexts/LanguageContext';
import { AppProvider } from '@/lib/contexts/AppContext';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { ToastContainer } from '@/components/ui/Toast';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FlavorQuest - Khám Phá Ẩm Thực Vĩnh Khánh',
  description: 'Tour âm thanh tự động dẫn đường khám phá ẩm thực phố Vĩnh Khánh, Cần Thơ. Offline-first PWA với hỗ trợ đa ngôn ngữ.',
  applicationName: 'FlavorQuest',
  keywords: ['food tour', 'audio guide', 'Vĩnh Khánh', 'Cần Thơ', 'ẩm thực', 'PWA'],
  authors: [{ name: 'FlavorQuest Team' }],
  creator: 'FlavorQuest Team',
  publisher: 'FlavorQuest',
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FlavorQuest',
  },
  openGraph: {
    type: 'website',
    siteName: 'FlavorQuest',
    title: 'FlavorQuest - Khám Phá Ẩm Thực Vĩnh Khánh',
    description: 'Tour âm thanh tự động dẫn đường khám phá ẩm thực phố Vĩnh Khánh',
    locale: 'vi_VN',
    alternateLocale: ['en_US', 'ja_JP', 'fr_FR', 'ko_KR', 'zh_CN'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlavorQuest - Khám Phá Ẩm Thực Vĩnh Khánh',
    description: 'Tour âm thanh tự động dẫn đường khám phá ẩm thực phố Vĩnh Khánh',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ef4444' },
    { media: '(prefers-color-scheme: dark)', color: '#dc2626' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <LanguageProvider>
            <AppProvider>
              {children}
              <ToastContainer position="top-right" />
            </AppProvider>
          </LanguageProvider>
        </AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
