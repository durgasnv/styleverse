import { useCallback, useRef, useState } from 'react';
import type { Product } from '@/data/mock-data';
import { classifyGarmentSlot, computeGarmentBox, detectPose, type Box } from '@/lib/pose-fit';

export interface PlacedGarment {
  id: string;
  product: Product;
  box: Box;
}

export type BaseImage = { type: 'preset'; id: string; src: string } | { type: 'upload'; src: string };

type Keypoints = Awaited<ReturnType<typeof detectPose>>;

// Local, page-scoped state only — no persistence, no server calls. The base
// photo (preset or uploaded) never leaves the browser.
export function useTryOn() {
  const [baseImage, setBaseImage] = useState<BaseImage | null>(null);
  const [garments, setGarments] = useState<PlacedGarment[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const keypointsCache = useRef<{ src: string; keypoints: Keypoints } | null>(null);

  const selectPresetModel = useCallback((id: string, src: string) => {
    setBaseImage({ type: 'preset', id, src });
    setGarments([]);
    keypointsCache.current = null;
  }, []);

  const selectUploadedPhoto = useCallback((src: string) => {
    setBaseImage({ type: 'upload', src });
    setGarments([]);
    keypointsCache.current = null;
  }, []);

  const addGarment = useCallback(
    async (product: Product) => {
      const slot = classifyGarmentSlot(product);
      const img = imgRef.current;
      let keypoints: Keypoints = null;

      if (img && baseImage) {
        if (keypointsCache.current?.src === baseImage.src) {
          keypoints = keypointsCache.current.keypoints;
        } else {
          keypoints = await detectPose(img);
          keypointsCache.current = { src: baseImage.src, keypoints };
        }
      }

      const dims = img ? { w: img.naturalWidth, h: img.naturalHeight } : { w: 0, h: 0 };
      const box = computeGarmentBox(keypoints, slot, dims);
      const id = `garment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setGarments((prev) => [...prev, { id, product, box }]);
    },
    [baseImage],
  );

  const removeGarment = useCallback((id: string) => {
    setGarments((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const updateGarmentBox = useCallback((id: string, box: Box) => {
    setGarments((prev) => prev.map((g) => (g.id === id ? { ...g, box } : g)));
  }, []);

  const reset = useCallback(() => {
    setBaseImage(null);
    setGarments([]);
    keypointsCache.current = null;
  }, []);

  return {
    baseImage,
    garments,
    imgRef,
    selectPresetModel,
    selectUploadedPhoto,
    addGarment,
    removeGarment,
    updateGarmentBox,
    reset,
  };
}
