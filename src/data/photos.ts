/**
 * Real photographs from Wikimedia Commons, used under their Creative Commons licences.
 * Files live in public/photos/<key>.jpg. Attribution is shown on /credits (required by the licences).
 */
export interface PhotoCredit {
  /** Commons file name. */
  title: string;
  artist: string;
  license: string;
  /** Commons page for the file. */
  page: string;
}

export const PHOTOS: Record<string, PhotoCredit> = {
  "mercedes-c-class-w205": {
    "title": "Mercedes-Benz C 220 BlueTEC Exclusive (W 205) – Frontansicht, 12. Juli 2014, Düsseldorf.jpg",
    "artist": "M 93",
    "license": "CC BY-SA 3.0 de",
    "page": "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_C_220_BlueTEC_Exclusive_(W_205)_%E2%80%93_Frontansicht,_12._Juli_2014,_D%C3%BCsseldorf.jpg"
  },
  "mercedes-e-class-w213": {
    "title": "Mercedes-Benz E-Klasse (W213) E 220 d (2017) (53331182462).jpg",
    "artist": "Charles from Port Chester, New York",
    "license": "CC BY 2.0",
    "page": "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_E-Klasse_(W213)_E_220_d_(2017)_(53331182462).jpg"
  },
  "mercedes-glc-x253": {
    "title": "2018 Mercedes-Benz GLC 250 Urban Edition 4MATIC 2.0 Front.jpg",
    "artist": "Vauxford",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:2018_Mercedes-Benz_GLC_250_Urban_Edition_4MATIC_2.0_Front.jpg"
  },
  "bmw-3-series-g20": {
    "title": "BMW G20 (2022) IMG 7316.jpg",
    "artist": "Alexander-93",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:BMW_G20_(2022)_IMG_7316.jpg"
  },
  "bmw-5-series-g30": {
    "title": "BMW M5 (F90) 1X7A6242.jpg",
    "artist": "Alexander Migl",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:BMW_M5_(F90)_1X7A6242.jpg"
  },
  "bmw-x5-g05": {
    "title": "Paris Motor Show 2018, Paris (1Y7A2044).jpg",
    "artist": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Paris_Motor_Show_2018,_Paris_(1Y7A2044).jpg"
  },
  "audi-a4-b9": {
    "title": "Audi A4 B9 sedans (FL) 1X7A6816.jpg",
    "artist": "Alexander-93",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Audi_A4_B9_sedans_(FL)_1X7A6816.jpg"
  },
  "audi-a6-c8": {
    "title": "Geneva International Motor Show 2018, Le Grand-Saconnex (1X7A1494).jpg",
    "artist": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Geneva_International_Motor_Show_2018,_Le_Grand-Saconnex_(1X7A1494).jpg"
  },
  "audi-q5": {
    "title": "Audi Q5 FY 50 TFSI e Facelift IMG 5284.jpg",
    "artist": "Alexander Migl",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Audi_Q5_FY_50_TFSI_e_Facelift_IMG_5284.jpg"
  },
  "porsche-911": {
    "title": "Porsche 992 Carrera S coupe IMG 5838.jpg",
    "artist": "Alexander Migl",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Porsche_992_Carrera_S_coupe_IMG_5838.jpg"
  },
  "porsche-cayenne": {
    "title": "Porsche Cayenne, IAA 2017 (1Y7A2256).jpg",
    "artist": "MB-one",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Porsche_Cayenne,_IAA_2017_(1Y7A2256).jpg"
  },
  "porsche-panamera": {
    "title": "Porsche 972 Turbo E-Hybrid IMG 0445.jpg",
    "artist": "Alexander-93",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Porsche_972_Turbo_E-Hybrid_IMG_0445.jpg"
  },
  "porsche-macan": {
    "title": "Porsche Macan T 1X7A6051.jpg",
    "artist": "Alexander Migl",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Porsche_Macan_T_1X7A6051.jpg"
  },
  "porsche-taycan": {
    "title": "2024 Porsche Taycan Sport Turismo IMG 9326.jpg",
    "artist": "Alexander-93",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:2024_Porsche_Taycan_Sport_Turismo_IMG_9326.jpg"
  },
  "porsche-718-cayman": {
    "title": "Porsche 718 Cayman GTS 1X7A7165.jpg",
    "artist": "Alexander-93",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Porsche_718_Cayman_GTS_1X7A7165.jpg"
  },
  "bmw-m4-g82": {
    "title": "BMW M4 (G82) Competition 1X7A6103.jpg",
    "artist": "Alexander Migl",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:BMW_M4_(G82)_Competition_1X7A6103.jpg"
  },
  "bmw-7-series-g70": {
    "title": "BMW 7-Series (G70) 750e 1X7A2461.jpg",
    "artist": "Alexander-93",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:BMW_7-Series_(G70)_750e_1X7A2461.jpg"
  },
  "bmw-x7-g07": {
    "title": "BMW G07 1X7A1696.jpg",
    "artist": "Alexander-93",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:BMW_G07_1X7A1696.jpg"
  },
  "bmw-x3-g01": {
    "title": "BMW X3 M (G01) 1X7A6436.jpg",
    "artist": "Alexander Migl",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:BMW_X3_M_(G01)_1X7A6436.jpg"
  },
  "lamborghini-huracan": {
    "title": "Lamborghini Huracan Evo, GIMS 2019, Le Grand-Saconnex (GIMS1010).jpg",
    "artist": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Lamborghini_Huracan_Evo,_GIMS_2019,_Le_Grand-Saconnex_(GIMS1010).jpg"
  },
  "volvo-s90": {
    "title": "2020 Volvo S90 Recharge T8 AWD Inscription.jpg",
    "artist": "Chanokchon",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:2020_Volvo_S90_Recharge_T8_AWD_Inscription.jpg"
  },
  "hero": {
    "title": "Porsche 911 GT3 Touring, IAA 2017, Frankfurt (1Y7A2766).jpg",
    "artist": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Porsche_911_GT3_Touring,_IAA_2017,_Frankfurt_(1Y7A2766).jpg"
  },
  "feature-own-car": {
    "title": "Porsche 992 Turbo S 1X7A0363.jpg",
    "artist": "Alexander Migl",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Porsche_992_Turbo_S_1X7A0363.jpg"
  },
  "discover-wheels": {
    "title": "Paris Motor Show 2018, Paris (1Y7A2043).jpg",
    "artist": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Paris_Motor_Show_2018,_Paris_(1Y7A2043).jpg"
  },
  "discover-colours": {
    "title": "Porsche 911 GT3 RS, GIMS 2018, Le Grand-Saconnex (1X7A0087).jpg",
    "artist": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Porsche_911_GT3_RS,_GIMS_2018,_Le_Grand-Saconnex_(1X7A0087).jpg"
  },
  "discover-aero": {
    "title": "Porsche 911 GT3 Touring, IAA 2017, Frankfurt (1Y7A2770).jpg",
    "artist": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "page": "https://commons.wikimedia.org/wiki/File:Porsche_911_GT3_Touring,_IAA_2017,_Frankfurt_(1Y7A2770).jpg"
  }
};

/** URL of the photo stored under `key` (a vehicle id, or a named slot such as "hero"), or null. */
export const photoUrl = (key: string): string | null => {
  const k = SAME_PHOTO[key] ?? key;
  return PHOTOS[k] ? `/photos/${k}.jpg` : null;
};

/** Entries that reuse another entry's photo (a second version of the same car). */
const SAME_PHOTO: Record<string, string> = { 'volvo-s90-v2': 'volvo-s90', 'volvo-s90-v3': 'volvo-s90' };
