import { notFound } from 'next/navigation';
import { Configurator } from '@/components/configurator/Configurator';
import { CUSTOM_PAINT_FINISHES } from '@/data/products';
import { getVehicle, vehicleTitle } from '@/data/vehicles';
import type { OwnPaint } from '@/hooks/useConfigurator';

export function generateMetadata({ params }: { params: { vehicleId: string } }) {
  const v = getVehicle(params.vehicleId);
  return { title: v ? `${vehicleTitle(v)} ${v.generation} — Configurator` : 'Configurator' };
}

/** `?paint=rrggbb&finish=metallic&pname=Guards%20Red` — set by the photo identification flow. */
function readOwnPaint(sp: { paint?: string; finish?: string; pname?: string }): OwnPaint | undefined {
  if (!sp.paint || !/^[0-9a-f]{6}$/i.test(sp.paint)) return undefined;
  const finish = CUSTOM_PAINT_FINISHES.some((f) => f.id === sp.finish) ? sp.finish! : 'gloss';
  const name = (sp.pname ?? '').trim().slice(0, 60) || 'Your paint';
  return { color: `#${sp.paint.toLowerCase()}`, finish, name };
}

export default function ConfiguratorPage({
  params, searchParams,
}: {
  params: { vehicleId: string };
  searchParams: { gen?: string; year?: string; paint?: string; finish?: string; pname?: string };
}) {
  const vehicle = getVehicle(params.vehicleId);
  if (!vehicle) notFound();
  const year = Number(searchParams.year) || undefined;
  return (
    <Configurator
      vehicleId={vehicle.id}
      generation={searchParams.gen ?? vehicle.generation}
      year={year}
      ownPaint={readOwnPaint(searchParams)}
    />
  );
}
