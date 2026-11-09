import type { Metadata } from 'next';
import { Caveat, IBM_Plex_Sans_Arabic, Inter, Nunito } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-latin' });
const display = Nunito({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
const script = Caveat({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-script' });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-arabic',
});

export const metadata: Metadata = {
  title: 'Wasli',
  description: 'Student pickup coordination for tutoring centers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${display.variable} ${script.variable} ${arabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
