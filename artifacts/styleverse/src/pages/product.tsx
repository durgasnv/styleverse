import { useEffect, useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useProducts } from '../hooks/use-catalog';
import { useStore } from '../hooks/use-store';
import { Button } from '@/components/ui/button';
import { Star, Heart, ShoppingBag, Truck, Undo2, BadgePercent, Sparkles, FolderHeart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SaveToCollectionDialog } from '../components/SaveToCollectionDialog';
import { Spinner } from '@/components/ui/spinner';

export default function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const [, setLocation] = useLocation();
  const { state, addToBag, toggleWishlist } = useStore();
  const { toast } = useToast();
  const { products, isLoading } = useProducts();

  const product = products.find(p => p.id === params?.id);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [sizeError, setSizeError] = useState(false);

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params?.id]);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="size-8" /></div>;
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-heading text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-gray-500 mb-8">The product you're looking for doesn't exist or has been removed.</p>
        <Link href="/" className="bg-[#FF3F6C] text-white px-6 py-2 rounded font-bold uppercase tracking-wide">Continue Shopping</Link>
      </div>
    );
  }

  const isWishlisted = state.wishlist.includes(product.id);

  const handleAddToBag = () => {
    if (!selectedSize) {
      setSizeError(true);
      // Scroll to sizes if needed
      return;
    }
    
    addToBag(product.id, selectedSize, 1);
    toast({
      title: "Added to Bag",
      description: `${product.name} (Size: ${selectedSize}) was added to your bag.`,
      duration: 3000,
      action: <Button variant="outline" size="sm" onClick={() => setLocation('/bag')}>View Bag</Button>
    });
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    setSizeError(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-7xl">
      <div className="text-xs text-gray-500 mb-4 hidden md:block">
        <Link href="/" className="hover:text-gray-900">Home</Link> / <Link href={`/search?c=${product.category}`} className="hover:text-gray-900">{product.category}</Link> / <span className="font-bold text-gray-900">{product.brand}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Images */}
        <div className="w-full md:w-1/2 lg:w-7/12 flex gap-2 overflow-hidden">
          <div className="hidden lg:flex flex-col gap-2 w-20">
            {product.images.map((img, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-100 cursor-pointer border hover:border-[#FF3F6C]">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="flex-1 aspect-[3/4] bg-gray-100 overflow-hidden relative group">
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 origin-top" />
          </div>
        </div>

        {/* Info */}
        <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col">
          <h1 className="text-2xl font-bold text-[#282C3F] tracking-tight">{product.brand}</h1>
          <p className="text-lg text-gray-500 mt-1">{product.name}</p>
          
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-0.5 w-fit">
              <span className="font-bold text-sm">{product.rating}</span>
              <Star className="h-3 w-3 fill-[#03A685] text-[#03A685]" />
              <span className="text-gray-300 mx-1">|</span>
              <span className="text-sm text-gray-500 font-mono">{product.reviewCount} Ratings</span>
            </div>
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          <div className="font-mono flex items-end gap-3">
            <span className="text-2xl font-bold text-[#282C3F]">₹{product.price}</span>
            {product.discountPercent > 0 && (
              <>
                <span className="text-xl text-gray-500 line-through">MRP ₹{product.mrp}</span>
                <span className="text-xl font-bold text-[#FF3F6C]">({product.discountPercent}% OFF)</span>
              </>
            )}
          </div>
          <p className="text-[#03A685] text-sm font-bold mt-2">inclusive of all taxes</p>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                Select Size
                {sizeError && <span className="text-[#FF3F6C] text-xs lowercase ml-2">Please select a size</span>}
              </h3>
              <button className="text-[#FF3F6C] text-sm font-bold uppercase tracking-wider">Size Chart</button>
            </div>
            <div className="flex flex-wrap gap-4">
              {product.sizes.map((size) => {
                const isSelected = selectedSize === size.label;
                return (
                  <button
                    key={size.label}
                    disabled={!size.inStock}
                    onClick={() => handleSizeSelect(size.label)}
                    className={cn(
                      "w-12 h-12 rounded-full border flex items-center justify-center font-bold text-sm transition-all font-mono",
                      isSelected 
                        ? "border-[#FF3F6C] text-[#FF3F6C] bg-pink-50" 
                        : size.inStock 
                          ? "border-gray-300 text-[#282C3F] hover:border-[#FF3F6C]" 
                          : "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50 relative after:content-[''] after:absolute after:w-full after:h-px after:bg-gray-300 after:rotate-45"
                    )}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <Button 
              size="lg" 
              className="flex-1 bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold tracking-wider py-6"
              onClick={handleAddToBag}
              data-testid="btn-add-to-bag"
            >
              <ShoppingBag className="mr-2 h-5 w-5" /> ADD TO BAG
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className={cn("flex-[0.5] font-bold tracking-wider py-6 border-gray-300", isWishlisted && "border-[#FF3F6C] text-[#FF3F6C] bg-pink-50")}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart className={cn("mr-2 h-5 w-5", isWishlisted && "fill-[#FF3F6C]")} /> WISHLIST
            </Button>
          </div>

          <div className="mt-4 border border-[#FF3F6C]/20 bg-pink-50/50 rounded-md p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#282C3F] flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-[#FF3F6C]" /> StyleVerse Integration
                </h4>
                <p className="text-xs text-gray-600 mt-1">Design an outfit with this item or save it for later.</p>
              </div>
              <div className="flex gap-2">
                <SaveToCollectionDialog productId={product.id}>
                  <Button variant="outline" size="sm" className="h-8 border-[#FF3F6C]/30 text-[#FF3F6C] hover:bg-pink-50">
                    <FolderHeart className="h-4 w-4 mr-1" /> Save
                  </Button>
                </SaveToCollectionDialog>
                <Button size="sm" className="h-8 bg-[#282C3F] hover:bg-black" onClick={() => setLocation('/canvas')}>
                  Open in Canvas
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <h3 className="font-bold uppercase text-sm tracking-wider flex items-center gap-2 mb-4">
                Delivery Options <Truck className="h-5 w-5 text-gray-500" />
              </h3>
              <div className="flex items-center gap-2 border border-gray-300 rounded p-2 mb-4 max-w-sm">
                <input type="text" placeholder="Enter Pincode" className="flex-1 outline-none text-sm px-2 font-mono" />
                <button className="text-[#FF3F6C] text-sm font-bold px-4">Check</button>
              </div>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2"><Truck className="h-4 w-4"/> {product.deliveryEstimate}</li>
                <li className="flex items-center gap-2"><Undo2 className="h-4 w-4"/> 14 days return & exchange available</li>
                <li className="flex items-center gap-2"><BadgePercent className="h-4 w-4"/> Pay on delivery available</li>
              </ul>
            </div>
            
            <div className="border-t border-gray-200"></div>

            <div>
              <h3 className="font-bold uppercase text-sm tracking-wider mb-4">Product Details</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-y-4">
                <div>
                  <span className="text-xs text-gray-500 block">Occasion</span>
                  <span className="text-sm font-medium capitalize">{product.occasionTags.join(', ')}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Category</span>
                  <span className="text-sm font-medium">{product.subcategory}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
