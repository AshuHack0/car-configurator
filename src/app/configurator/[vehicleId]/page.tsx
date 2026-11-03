import { notFound } from 'next/navigation';
import { Configurator } from '@/components/configurator/Configurator';
import { getVehicle, vehicleTitle } from '@/data/vehicles';

export function generateMetadata({ params }: { params: { vehicleId: string } }) {
  const v = getVehicle(params.vehicleId);
  return { title: v ? `${vehicleTitle(v)} ${v.generation} — Configurator` : 'Configurator' };
}

export default function ConfiguratorPage({
  params, searchParams,
}: {
  params: { vehicleId: string };
  searchParams: { gen?: string; year?: string };
}) {
  const vehicle = getVehicle(params.vehicleId);
  if (!vehicle) notFound();
  const year = Number(searchParams.year) || undefined;
  return <Configurator vehicleId={vehicle.id} generation={searchParams.gen ?? vehicle.generation} year={year} />;
}
