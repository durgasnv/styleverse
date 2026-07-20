import { useCallback, useRef, useState } from 'react';
import { toDataUrl } from '@/lib/image-utils';

export type BaseImage = { type: 'preset'; id: string; src: string } | { type: 'upload'; src: string };

export interface TryOnGarment {
  name: string;
  image: string;
}

// Local, page-scoped state only — no persistence, no server calls. The base
// photo (preset or uploaded) never leaves the browser. Garments come from
// wherever the caller's outfit lives (e.g. Style Canvas items) rather than
// being managed here.
export function useTryOn() {
  const [baseImage, setBaseImage] = useState<BaseImage | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const selectPresetModel = useCallback((id: string, src: string) => {
    setBaseImage({ type: 'preset', id, src });
    setResultImage(null);
    setGenerateError(null);
  }, []);

  const selectUploadedPhoto = useCallback((src: string) => {
    setBaseImage({ type: 'upload', src });
    setResultImage(null);
    setGenerateError(null);
  }, []);

  const resetBaseImage = useCallback(() => {
    setBaseImage(null);
    setResultImage(null);
    setGenerateError(null);
  }, []);

  // Sends the base photo plus every given garment to the AI try-on endpoint
  // in a single call, so the model composites the whole outfit at once
  // rather than compounding edits across repeated calls.
  const generateTryOn = useCallback(
    async (garments: TryOnGarment[]) => {
      if (!baseImage || garments.length === 0) return;
      setIsGenerating(true);
      setGenerateError(null);
      try {
        const [baseDataUrl, garmentDataUrls] = await Promise.all([
          toDataUrl(baseImage.src),
          Promise.all(garments.map((g) => toDataUrl(g.image))),
        ]);

        const res = await fetch('/api/tryon/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseImage: baseDataUrl,
            garments: garments.map((g, i) => ({ name: g.name, image: garmentDataUrls[i] })),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Request failed (${res.status})`);
        }

        const data = (await res.json()) as { image: string };
        setResultImage(data.image);
      } catch (err) {
        setGenerateError(err instanceof Error ? err.message : 'Something went wrong generating your try-on.');
      } finally {
        setIsGenerating(false);
      }
    },
    [baseImage],
  );

  return {
    baseImage,
    resultImage,
    isGenerating,
    generateError,
    imgRef,
    selectPresetModel,
    selectUploadedPhoto,
    generateTryOn,
    resetBaseImage,
  };
}
