import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Visualizer } from '@/components/visualize/Visualizer';

export const metadata = { title: 'See it for real — Modifed' };

export default function VisualizePage() {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <Visualizer />
      </Suspense>
      <SiteFooter />
    </>
  );
}
