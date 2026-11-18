import { ArrowRight } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { photoUrl } from '@/data/photos';
import { formatINR } from '@/data/products';
import { getBrand } from '@/data/vehicles';
import type { Vehicle } from '@/types/vehicle';
import { VehicleSilhouette } from './VehicleSilhouette';
import styles from './VehicleCard.module.css';

/** A real photograph of this model, when we have one; otherwise null. */
export const vehiclePhoto = (vehicle: Vehicle): string | null => photoUrl(vehicle.id);

/** Card picture: a photograph of the model, or a body-style drawing when none exists yet. */
export function VehicleArt({ vehicle }: { vehicle: Vehicle }) {
  const photo = vehiclePhoto(vehicle);
  return (
    <div className={styles.art}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={`${getBrand(vehicle.brand).name} ${vehicle.model}`} loading="lazy" />
      ) : (
        <VehicleSilhouette body={vehicle.body} accent="#6b6d70" />
      )}
    </div>
  );
}

const BODY_LABEL = { sedan: 'Saloon', suv: 'SUV', coupe: 'Coupé' } as const;
export const bodyLabel = (v: Vehicle) => BODY_LABEL[v.body];

/** Model tile used on the home page. */
export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const brand = getBrand(vehicle.brand);
  return (
    <article className={styles.card}>
      <VehicleArt vehicle={vehicle} />
      <div className={styles.body}>
        <div className={styles.tags}>
          <span>{bodyLabel(vehicle)}</span>
          <span>{vehicle.power}</span>
        </div>
        <h3>{brand.name} {vehicle.model}</h3>
        <p>From {formatINR(vehicle.basePrice)}</p>
        <div className={styles.actions}>
          <LinkButton href={`/vehicles?brand=${vehicle.brand}#${vehicle.id}`} variant="ghost" size="sm">Explore</LinkButton>
          <LinkButton href={`/configurator/${vehicle.id}`} variant="primary" size="sm" icon={<ArrowRight size={16} />}>Configure</LinkButton>
        </div>
      </div>
    </article>
  );
}
