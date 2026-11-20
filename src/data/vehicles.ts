import type { Brand, BrandId, Vehicle } from '@/types/vehicle';

export const BRANDS: Brand[] = [
  { id: 'mercedes', name: 'Mercedes-Benz', tagline: 'The best or nothing', accent: '#9CA3AF' },
  { id: 'bmw', name: 'BMW', tagline: 'Sheer driving pleasure', accent: '#3B82F6' },
  { id: 'audi', name: 'Audi', tagline: 'Progress through technology', accent: '#E11D48' },
  { id: 'porsche', name: 'Porsche', tagline: 'There is no substitute', accent: '#F59E0B' },
  { id: 'lamborghini', name: 'Lamborghini', tagline: 'Expect the unexpected', accent: '#EAB308' },
  { id: 'volvo', name: 'Volvo', tagline: 'For life', accent: '#1F3A5F' },
];

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => to - i);

export const VEHICLES: Vehicle[] = [
  {
    id: 'mercedes-c-class-w205', brand: 'mercedes', model: 'C-Class', generation: 'W205', body: 'sedan',
    basePrice: 5_800_000, power: '255 hp', assetId: 'studio-coupe',
    generations: [
      { code: 'W205', label: 'W205 (2014–2021)', years: range(2014, 2021) },
      { code: 'W206', label: 'W206 (2021–present)', years: range(2021, 2025) },
    ],
  },
  {
    id: 'mercedes-e-class-w213', brand: 'mercedes', model: 'E-Class', generation: 'W213', body: 'sedan',
    basePrice: 7_800_000, power: '299 hp', assetId: 'studio-coupe',
    generations: [
      { code: 'W212', label: 'W212 (2009–2016)', years: range(2009, 2016) },
      { code: 'W213', label: 'W213 (2016–2023)', years: range(2016, 2023) },
      { code: 'W214', label: 'W214 (2023–present)', years: range(2023, 2025) },
    ],
  },
  {
    id: 'mercedes-glc-x253', brand: 'mercedes', model: 'GLC', generation: 'X253', body: 'suv',
    basePrice: 7_600_000, power: '255 hp', assetId: 'studio-coupe',
    generations: [
      { code: 'X253', label: 'X253 (2015–2022)', years: range(2015, 2022) },
      { code: 'X254', label: 'X254 (2022–present)', years: range(2022, 2025) },
    ],
  },
  {
    id: 'bmw-3-series-g20', brand: 'bmw', model: '3 Series', generation: 'G20', body: 'sedan',
    basePrice: 5_100_000, power: '255 hp', assetId: 'bmw-m4-g82',
    generations: [
      { code: 'F30', label: 'F30 (2012–2019)', years: range(2012, 2019) },
      { code: 'G20', label: 'G20 (2019–present)', years: range(2019, 2025) },
    ],
  },
  {
    id: 'bmw-5-series-g30', brand: 'bmw', model: '5 Series', generation: 'G30', body: 'sedan',
    basePrice: 7_200_000, power: '248 hp', assetId: 'bmw-m4-g82',
    generations: [
      { code: 'F10', label: 'F10 (2010–2017)', years: range(2010, 2017) },
      { code: 'G30', label: 'G30 (2017–2023)', years: range(2017, 2023) },
      { code: 'G60', label: 'G60 (2023–present)', years: range(2023, 2025) },
    ],
  },
  {
    id: 'bmw-x5-g05', brand: 'bmw', model: 'X5', generation: 'G05', body: 'suv',
    basePrice: 9_700_000, power: '375 hp', assetId: 'bmw-m4-g82',
    generations: [
      { code: 'F15', label: 'F15 (2013–2018)', years: range(2013, 2018) },
      { code: 'G05', label: 'G05 (2018–present)', years: range(2018, 2025) },
    ],
  },
  {
    id: 'audi-a4-b9', brand: 'audi', model: 'A4', generation: 'B9', body: 'sedan',
    basePrice: 4_600_000, power: '201 hp', assetId: 'studio-coupe',
    generations: [
      { code: 'B8', label: 'B8 (2008–2015)', years: range(2008, 2015) },
      { code: 'B9', label: 'B9 (2015–2024)', years: range(2015, 2024) },
    ],
  },
  {
    id: 'audi-a6-c8', brand: 'audi', model: 'A6', generation: 'C8', body: 'sedan',
    basePrice: 6_500_000, power: '261 hp', assetId: 'studio-coupe',
    generations: [
      { code: 'C7', label: 'C7 (2011–2018)', years: range(2011, 2018) },
      { code: 'C8', label: 'C8 (2018–present)', years: range(2018, 2025) },
    ],
  },
  {
    id: 'audi-q5', brand: 'audi', model: 'Q5', generation: 'FY', body: 'suv',
    basePrice: 6_600_000, power: '261 hp', assetId: 'studio-coupe',
    generations: [
      { code: '8R', label: '8R (2008–2017)', years: range(2008, 2017) },
      { code: 'FY', label: 'FY (2017–2024)', years: range(2017, 2024) },
    ],
  },
  {
    id: 'porsche-911', brand: 'porsche', model: '911', generation: '992', body: 'coupe',
    basePrice: 18_600_000, power: '379 hp', assetId: 'porsche-911-991',
    generations: [
      { code: '991', label: '991 (2011–2019)', years: range(2011, 2019) },
      { code: '992', label: '992 (2019–present)', years: range(2019, 2025) },
    ],
  },
  {
    id: 'porsche-cayenne', brand: 'porsche', model: 'Cayenne', generation: '9Y0', body: 'suv',
    basePrice: 14_200_000, power: '348 hp', assetId: 'porsche-911-991',
    generations: [
      { code: '92A', label: '92A (2010–2017)', years: range(2010, 2017) },
      { code: '9Y0', label: '9Y0 (2017–present)', years: range(2017, 2025) },
    ],
  },
  {
    id: 'porsche-panamera', brand: 'porsche', model: 'Panamera', generation: '971', body: 'sedan',
    basePrice: 17_000_000, power: '348 hp', assetId: 'porsche-911-991',
    generations: [
      { code: '970', label: '970 (2009–2016)', years: range(2009, 2016) },
      { code: '971', label: '971 (2016–2023)', years: range(2016, 2023) },
      { code: '976', label: '976 (2023–present)', years: range(2023, 2025) },
    ],
  },
  {
    id: 'porsche-macan', brand: 'porsche', model: 'Macan', generation: '95B', body: 'suv',
    basePrice: 9_600_000, power: '261 hp', assetId: 'porsche-911-991',
    generations: [
      { code: '95B', label: '95B (2014–2024)', years: range(2014, 2024) },
      { code: 'XAB', label: 'Macan Electric (2024–present)', years: range(2024, 2025) },
    ],
  },
  {
    id: 'porsche-taycan', brand: 'porsche', model: 'Taycan', generation: 'Y1A', body: 'sedan',
    basePrice: 17_500_000, power: '402 hp', assetId: 'porsche-911-991',
    generations: [
      { code: 'Y1A', label: 'Y1A (2019–2024)', years: range(2019, 2024) },
      { code: 'Y1A-FL', label: 'Y1A facelift (2024–present)', years: range(2024, 2025) },
    ],
  },
  {
    id: 'porsche-718-cayman', brand: 'porsche', model: '718 Cayman', generation: '982', body: 'coupe',
    basePrice: 14_800_000, power: '300 hp', assetId: 'porsche-911-991',
    generations: [
      { code: '981', label: '981 Cayman (2012–2016)', years: range(2012, 2016) },
      { code: '982', label: '982 718 Cayman (2016–present)', years: range(2016, 2025) },
    ],
  },
  {
    id: 'bmw-m4-g82', brand: 'bmw', model: 'M4', generation: 'G82', body: 'coupe',
    basePrice: 15_000_000, power: '503 hp', assetId: 'bmw-m4-g82',
    generations: [
      { code: 'F82', label: 'F82 (2014–2020)', years: range(2014, 2020) },
      { code: 'G82', label: 'G82 (2021–present)', years: range(2021, 2025) },
    ],
  },
  {
    id: 'bmw-7-series-g70', brand: 'bmw', model: '7 Series', generation: 'G70', body: 'sedan',
    basePrice: 18_000_000, power: '375 hp', assetId: 'bmw-m4-g82',
    generations: [
      { code: 'G11', label: 'G11/G12 (2015–2022)', years: range(2015, 2022) },
      { code: 'G70', label: 'G70 (2022–present)', years: range(2022, 2025) },
    ],
  },
  {
    id: 'bmw-x7-g07', brand: 'bmw', model: 'X7', generation: 'G07', body: 'suv',
    basePrice: 13_000_000, power: '375 hp', assetId: 'bmw-m4-g82',
    generations: [
      { code: 'G07', label: 'G07 (2019–2022)', years: range(2019, 2022) },
      { code: 'G07-LCI', label: 'G07 LCI (2022–present)', years: range(2022, 2025) },
    ],
  },
  {
    id: 'bmw-x3-g01', brand: 'bmw', model: 'X3', generation: 'G01', body: 'suv',
    basePrice: 7_500_000, power: '248 hp', assetId: 'bmw-m4-g82',
    generations: [
      { code: 'F25', label: 'F25 (2010–2017)', years: range(2010, 2017) },
      { code: 'G01', label: 'G01 (2017–2024)', years: range(2017, 2024) },
      { code: 'G45', label: 'G45 (2024–present)', years: range(2024, 2025) },
    ],
  },
  {
    id: 'lamborghini-huracan', brand: 'lamborghini', model: 'Huracán', generation: 'EVO', body: 'coupe',
    basePrice: 37_000_000, power: '631 hp', assetId: 'studio-coupe',
    generations: [
      { code: 'LP610-4', label: 'LP 610-4 (2014–2019)', years: range(2014, 2019) },
      { code: 'EVO', label: 'EVO (2019–2024)', years: range(2019, 2024) },
    ],
  },
  {
    id: 'volvo-s90', brand: 'volvo', model: 'S90', generation: 'SPA', body: 'sedan',
    basePrice: 6_825_000, power: '250 hp', assetId: 'volvo-s90',
    generations: [
      { code: 'SPA', label: 'SPA (2016–present)', years: range(2016, 2025) },
    ],
  },
];

/** Brands the photo identification flow accepts (pilot: Porsche and BMW). */
export const IDENTIFY_BRANDS: BrandId[] = ['porsche', 'bmw'];

export function getVehicle(id: string): Vehicle | undefined {
  return VEHICLES.find((v) => v.id === id);
}

export function getBrand(id: BrandId): Brand {
  return BRANDS.find((b) => b.id === id)!;
}

export function vehiclesByBrand(id: BrandId): Vehicle[] {
  return VEHICLES.filter((v) => v.brand === id);
}

export const vehicleTitle = (v: Vehicle) => `${getBrand(v.brand).name} ${v.model}`;
