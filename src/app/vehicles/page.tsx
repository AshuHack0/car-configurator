import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { VehicleSelector } from '@/components/vehicle/VehicleSelector';

export const metadata = { title: 'Select your vehicle — Modifed' };

export default function VehiclesPage() {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <VehicleSelector />
      </Suspense>
      <SiteFooter />
    </>
  );
}
