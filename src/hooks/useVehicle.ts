'use client';

import { useMemo } from 'react';
import { getAssetConfig } from '@/data/demoAssets';
import { getBrand, getVehicle } from '@/data/vehicles';
import type { ComponentSupport } from '@/types/vehicle';
import type { Product } from '@/types/product';

export function useVehicle(vehicleId: string) {
  return useMemo(() => {
    const vehicle = getVehicle(vehicleId);
    if (!vehicle) return null;
    const asset = getAssetConfig(vehicle.assetId);
    /** How a product will be realised on this vehicle's 3D asset. */
    const supportFor = (product: Product): ComponentSupport =>
      product.impl.kind === 'preview' ? 'none' : asset.support[product.component] ?? 'none';
    return { vehicle, brand: getBrand(vehicle.brand), asset, supportFor };
  }, [vehicleId]);
}
