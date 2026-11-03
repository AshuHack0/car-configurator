import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Decoders are served from /public, so nothing is fetched from a CDN. */
export const DRACO_PATH = '/draco/';
const BASIS_PATH = '/basis/';

let ktx2: KTX2Loader | null = null;
function getKtx2(gl: THREE.WebGLRenderer) {
  if (!ktx2) ktx2 = new KTX2Loader().setTranscoderPath(BASIS_PATH).detectSupport(gl);
  return ktx2;
}

/**
 * Loads a GLB with Draco, Meshopt and KTX2 support. drei caches by URL, so a
 * model is fetched and parsed once however many times it is used.
 */
export function useModel(url: string) {
  const gl = useThree((s) => s.gl);
  return useGLTF(url, DRACO_PATH, true, (loader) => {
    (loader as unknown as GLTFLoader).setKTX2Loader(getKtx2(gl));
  });
}

/** Warm the cache for parts the customer is likely to pick next. */
export function preloadModels(urls: string[]) {
  urls.forEach((u) => useGLTF.preload(u, DRACO_PATH, true));
}

/** Drops a model from the cache and frees its GPU resources. */
export function releaseModel(url: string) {
  useGLTF.clear(url);
}
