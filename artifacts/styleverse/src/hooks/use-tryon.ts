import { useCallback, useRef, useState } from 'react';
import { toDataUrl } from '@/lib/image-utils';
import type { GarmentRegion } from '@/lib/garment-region';

export type BaseImage = { type: 'preset'; id: string; src: string } | { type: 'upload'; src: string };

export interface TryOnGarment {
  name: string;
  image: string;
  region?: GarmentRegion;
}

// Keep in sync with MAX_GARMENTS in artifacts/api-server/src/routes/tryon.ts
// — the server enforces the real cap, this just avoids a round trip for the
// common case and lets the UI warn before submitting.
export const MAX_TRYON_GARMENTS = 6;

export interface RecentTryOnResult {
  image: string;
  fitNote?: string;
  timestamp: number;
}

// Purely a client-side "recently tried on" gallery — browser-local, capped
// small since results are base64 data URLs and localStorage has a low quota.
const RECENT_RESULTS_KEY = 'styleverse:recent-tryons';
const MAX_RECENT_RESULTS = 6;

function loadRecentResults(): RecentTryOnResult[] {
  try {
    const raw = localStorage.getItem(RECENT_RESULTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentResults(results: RecentTryOnResult[]) {
  try {
    localStorage.setItem(RECENT_RESULTS_KEY, JSON.stringify(results));
  } catch {
    // Quota exceeded or storage disabled — the gallery is a nice-to-have, fail silently.
  }
}

// Local, page-scoped state only — no persistence, no server calls. The base
// photo (preset or uploaded) never leaves the browser. Garments come from
// wherever the caller's outfit lives (e.g. Style Canvas items) rather than
// being managed here.
export function useTryOn() {
  const [baseImage, setBaseImage] = useState<BaseImage | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [fitNote, setFitNote] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [recentResults, setRecentResults] = useState<RecentTryOnResult[]>(() => loadRecentResults());
  const imgRef = useRef<HTMLImageElement | null>(null);

  const selectPresetModel = useCallback((id: string, src: string) => {
    setBaseImage({ type: 'preset', id, src });
    setResultImage(null);
    setFitNote(null);
    setGenerateError(null);
  }, []);

  const selectUploadedPhoto = useCallback((src: string) => {
    setBaseImage({ type: 'upload', src });
    setResultImage(null);
    setFitNote(null);
    setGenerateError(null);
  }, []);

  const resetBaseImage = useCallback(() => {
    setBaseImage(null);
    setResultImage(null);
    setFitNote(null);
    setGenerateError(null);
  }, []);

  // Sends the base photo plus every given garment to the AI try-on endpoint
  // in a single call, so the model composites the whole outfit at once
  // rather than compounding edits across repeated calls.
  const generateTryOn = useCallback(
    async (garments: TryOnGarment[]) => {
      const capped = garments.slice(0, MAX_TRYON_GARMENTS);
      if (!baseImage || capped.length === 0) return;
      setIsGenerating(true);
      setGenerateError(null);
      try {
        const [baseDataUrl, garmentDataUrls] = await Promise.all([
          toDataUrl(baseImage.src),
          Promise.all(capped.map((g) => toDataUrl(g.image))),
        ]);

        const res = await fetch('/api/tryon/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseImage: baseDataUrl,
            garments: capped.map((g, i) => ({ name: g.name, image: garmentDataUrls[i], region: g.region })),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Request failed (${res.status})`);
        }

        const data = (await res.json()) as { image: string; fitNote?: string };
        setResultImage(data.image);
        setFitNote(data.fitNote ?? null);
        setRecentResults((prev) => {
          const next = [
            { image: data.image, fitNote: data.fitNote, timestamp: Date.now() },
            ...prev.filter((r) => r.image !== data.image),
          ].slice(0, MAX_RECENT_RESULTS);
          saveRecentResults(next);
          return next;
        });
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
    fitNote,
    isGenerating,
    generateError,
    recentResults,
    imgRef,
    selectPresetModel,
    selectUploadedPhoto,
    generateTryOn,
    resetBaseImage,
  };
}
