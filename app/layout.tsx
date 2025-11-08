import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AudioPlayerProvider } from '@/contexts/audio-player-context';
import { PersistentPlayer } from '@/components/audio/persistent-player';
import { PlayerAwareLayout } from '@/components/layout/player-aware-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HakiVo - Know What Congress Is Doing',
  description: 'Track bills, understand legislation, follow your representatives\' votes, and stay informed—all in plain English',
  themeColor: '#0A0A0F',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className} suppressHydrationWarning>
        <AudioPlayerProvider>
          <PersistentPlayer />
          <PlayerAwareLayout>
            {children}
          </PlayerAwareLayout>
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
