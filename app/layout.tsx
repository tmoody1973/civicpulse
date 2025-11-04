import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AudioPlayerProvider } from '@/contexts/audio-player-context';
import { PersistentPlayer } from '@/components/audio/persistent-player';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HakiVo - Know What Congress Is Doing',
  description: 'Track bills, understand legislation, follow your representatives\' votes, and stay informed—all in plain English',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AudioPlayerProvider>
          <PersistentPlayer />
          <div className="pt-20">
            {children}
          </div>
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
