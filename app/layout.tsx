import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

import { SWRegister } from '@/src/components';
import Providers from './providers';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Battle Arena | Ihsan Nurul Habib - Portfolio',
  description:
    'Challenge your friends in real-time knowledge battles! Create or join quiz battles on various topics.',
  manifest: '/manifest.json',
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
        <Providers>
          <SWRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
