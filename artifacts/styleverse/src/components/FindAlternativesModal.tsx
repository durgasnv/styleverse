import { useMemo } from 'react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { findAlternatives } from '../lib/find-alternatives';
import type { Product } from '../data/mock-data';

export function FindAlternativesModal({
  priciest,
  allProducts,
  currentOutfitIds,
  onSwap,
  onOpenChange,
}: {
  priciest: Product | null;
  allProducts: Product[];
  currentOutfitIds: string[];
  onSwap: (originalId: string, replacement: Product) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const alternatives = useMemo(
    () => (priciest ? findAlternatives(priciest, allProducts, currentOutfitIds) : []),
    [priciest, allProducts, currentOutfitIds],
  );

  if (!priciest) return null;

  return (
    <Dialog open={priciest !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Better alternatives to {priciest.name}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 bg-gray-50 border rounded-lg p-3 mb-2">
          <img src={priciest.images[0]} alt={priciest.name} className="w-14 h-14 rounded-md object-cover bg-white shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase text-gray-400">{priciest.brand}</p>
            <p className="text-sm font-semibold text-[#282C3F] truncate">{priciest.name}</p>
          </div>
          <p className="text-sm font-extrabold text-[#282C3F] shrink-0">₹{priciest.price.toLocaleString('en-IN')}</p>
        </div>

        {alternatives.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No cheaper alternatives found in {priciest.subcategory} right now.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto py-1">
            {alternatives.map((alt) => (
              <div key={alt.id} className="border rounded-lg p-2 flex flex-col gap-1.5">
                <Link href={`/product/${alt.id}`} className="flex flex-col gap-1.5">
                  <img src={alt.images[0]} alt={alt.name} className="w-full aspect-square object-cover rounded bg-gray-100" />
                  <p className="text-[10px] font-extrabold uppercase text-gray-400 truncate">{alt.brand}</p>
                  <p className="text-xs font-semibold text-[#282C3F] truncate">{alt.name}</p>
                </Link>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#282C3F]">₹{alt.price.toLocaleString('en-IN')}</span>
                  <span className="flex items-center gap-0.5 text-gray-500">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {alt.rating}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white mt-1"
                  onClick={() => onSwap(priciest.id, alt)}
                >
                  Swap In
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
