import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

import Providers from './providers';
import { UnregisterServiceWorker } from './UnregisterServiceWorker';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Battle Arena',
  description:
    'Challenge your friends in real-time knowledge battles! Create or join quiz battles on various topics.',
  icons: {
    icon: '/images/battle-icon.svg',
    apple: '/images/battle-icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} antialiased`}
        style={{ fontFamily: 'var(--font-outfit)' }}
      >
        <UnregisterServiceWorker />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
