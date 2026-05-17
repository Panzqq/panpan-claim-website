import './globals.css';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'PanPan SW HD',
  description: 'Upload video lalu claim melalui bot WhatsApp.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${display.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
