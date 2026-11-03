import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getBrand } from '@/data/vehicles';
import type { Vehicle } from '@/types/vehicle';
import { VehicleSilhouette } from './VehicleSilhouette';
import styles from './VehicleCard.module.css';

export function VehicleCard({ vehicle, href }: { vehicle: Vehicle; href?: string }) {
  const brand = getBrand(vehicle.brand);
  return (
    <Link href={href ?? `/vehicles?brand=${vehicle.brand}&vehicle=${vehicle.id}`} className={styles.card}>
      <div className={styles.top}>
        <span className={styles.brand}>{brand.name}</span>
        <ArrowUpRight size={18} className={styles.arrow} />
      </div>
      <div className={styles.art}>
        <VehicleSilhouette body={vehicle.body} accent={brand.accent} />
      </div>
      <div className={styles.meta}>
        <h3>{vehicle.model} <span>{vehicle.generation}</span></h3>
        <p>{vehicle.power} · {vehicle.body.toUpperCase()}</p>
      </div>
    </Link>
  );
}
