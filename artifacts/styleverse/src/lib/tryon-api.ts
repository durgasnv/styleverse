// Must match BODY_TYPES in artifacts/api-server/src/lib/tryon.ts and the base
// model images in public/img/models/<id>.jpg.
export interface BodyTypeOption {
  id: 'xs' | 's' | 'm' | 'l' | 'plus';
  label: string;
  description: string;
  modelImage: string;
}

export const BODY_TYPES: BodyTypeOption[] = [
  { id: 'xs', label: 'XS', description: 'Petite', modelImage: '/img/models/xs.png' },
  { id: 's', label: 'S', description: 'Slim', modelImage: '/img/models/s.png' },
  { id: 'm', label: 'M', description: 'Regular', modelImage: '/img/models/m.png' },
  { id: 'l', label: 'L', description: 'Curvy', modelImage: '/img/models/l.png' },
  { id: 'plus', label: 'Plus', description: 'Plus size', modelImage: '/img/models/plus.png' },
];

export async function requestTryon(params: {
  productId: string;
  bodyType: BodyTypeOption['id'];
}): Promise<{ imageUrl: string; cached: boolean }> {
  const res = await fetch('/api/tryon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Try-on failed (${res.status})`);
  return res.json();
}
