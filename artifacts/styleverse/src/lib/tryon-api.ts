// Must match BODY_TYPES in artifacts/api-server/src/lib/tryon.ts and the base
// model images in public/img/models/<id>.jpg.
export interface BodyTypeOption {
  id: 'inverted-triangle' | 'apple' | 'hourglass' | 'pear' | 'rectangle';
  label: string;
  description: string;
  modelImage: string;
}

export const BODY_TYPES: BodyTypeOption[] = [
  { id: 'inverted-triangle', label: '▽ Triangle', description: 'Broad shoulders', modelImage: '/img/models/inverted-triangle.png' },
  { id: 'apple', label: 'Apple', description: 'Fuller middle', modelImage: '/img/models/apple.png' },
  { id: 'hourglass', label: 'Hourglass', description: 'Defined waist', modelImage: '/img/models/hourglass.png' },
  { id: 'pear', label: 'Pear', description: 'Fuller hips', modelImage: '/img/models/pear.png' },
  { id: 'rectangle', label: 'Rectangle', description: 'Straight frame', modelImage: '/img/models/rectangle.png' },
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
