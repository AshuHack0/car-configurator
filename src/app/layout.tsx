import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { MotionRoot } from '@/components/motion/MotionRoot';
import './globals.css';

const geistSans = localFont({ src: './fonts/GeistVF.woff', variable: '--font-sans', weight: '100 900' });
const geistMono = localFont({ src: './fonts/GeistMonoVF.woff', variable: '--font-mono', weight: '100 900' });

export const metadata: Metadata = {
  title: 'Modifed — 3D Vehicle Configurator',
  description: 'Customise every detail. Explore your vehicle in 3D. Make it yours.',
};

export const viewport: Viewport = { themeColor: '#07080a', width: 'device-width', initialScale: 1 };

const INIT = `(function(){var d=document.documentElement;d.classList.add('js');try{if(location.pathname==='/'&&!sessionStorage.getItem('modifed:intro')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.setAttribute('data-intro','');}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Before first paint: mark that JS runs (reveals may hide content until it scrolls in), and
          decide whether the home-page intro plays (first visit of the session, motion allowed).
        */}
        <script dangerouslySetInnerHTML={{ __html: INIT }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <MotionRoot />
      </body>
    </html>
  );
}
