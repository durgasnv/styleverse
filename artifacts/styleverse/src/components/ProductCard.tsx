import { Link } from 'wouter';
import { Product } from '../data/mock-data';
import { Heart, Star } from 'lucide-react';
import { useStore } from '../hooks/use-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ProductCard({ product }: { product: Product }) {
  const { state, toggleWishlist } = useStore();
  const isWishlisted = state.wishlist.includes(product.id);

  return (
    <div className="group relative flex flex-col bg-white border border-transparent hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden w-full max-w-sm" data-testid={`card-product-${product.id}`}>
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        <Link href={`/product/${product.id}`} className="block w-full h-full">
          <img 
            src={product.images[0]} 
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </Link>
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 hover:text-[#FF3F6C]"
            onClick={() => toggleWishlist(product.id)}
            data-testid={`btn-wishlist-${product.id}`}
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-[#FF3F6C] text-[#FF3F6C]")} />
          </Button>
        </div>
        <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-sm flex items-center gap-1 text-[10px] font-bold font-mono">
          <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400"/> {product.rating}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">{product.reviewCount >= 1000 ? (product.reviewCount/1000).toFixed(1) + 'k' : product.reviewCount}</span>
        </div>
      </div>
      
      <div className="p-3 flex flex-col gap-1">
        <h3 className="font-bold text-sm text-[#282C3F] truncate">{product.brand}</h3>
        <p className="text-xs text-gray-500 truncate">{product.name}</p>
        <div className="flex items-center gap-2 mt-1 font-mono text-sm">
          <span className="font-bold text-[#282C3F]">₹{product.price}</span>
          {product.discountPercent > 0 && (
            <>
              <span className="text-xs text-gray-400 line-through">₹{product.mrp}</span>
              <span className="text-xs font-bold text-[#FF3F6C]">({product.discountPercent}% OFF)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
