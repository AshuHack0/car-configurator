import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({ src: './fonts/GeistVF.woff', variable: '--font-sans', weight: '100 900' });
const geistMono = localFont({ src: './fonts/GeistMonoVF.woff', variable: '--font-mono', weight: '100 900' });

export const metadata: Metadata = {
  title: 'Dream Machine — 3D Vehicle Configurator',
  description: 'Customise every detail. Explore your vehicle in 3D. Make it yours.',
};

export const viewport: Viewport = { themeColor: '#f4f5f7', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
