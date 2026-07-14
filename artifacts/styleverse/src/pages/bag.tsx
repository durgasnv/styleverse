import { useStore } from '../hooks/use-store';
import { useProducts } from '../hooks/use-catalog';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Truck, Undo2, X, Plus, Minus, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function Bag() {
  const { state, updateBagItem, removeBagItem, toggleWishlist } = useStore();
  const { products, isLoading } = useProducts();
  const [, setLocation] = useLocation();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  // Hydrate bag items with product details
  const bagItems = state.bag.map(item => {
    const product = products.find(p => p.id === item.productId);
    return { ...item, product };
  }).filter(item => item.product !== undefined) as (typeof state.bag[0] & { product: typeof products[0] })[];

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'MYNTRA500' || promoCode.toUpperCase() === 'STYLEVERSE') {
      setAppliedPromo(promoCode.toUpperCase());
    } else {
      alert("Invalid Promo Code. Try 'MYNTRA500'");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="size-8" /></div>;
  }

  if (bagItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 bg-gray-50">
        <div className="w-48 h-48 mb-6 relative">
          <img src="https://constant.myntassets.com/checkout/assets/img/empty-bag.webp" alt="Empty Bag" className="w-full h-full object-contain mix-blend-multiply" onError={(e) => e.currentTarget.style.display = 'none'} />
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-full -z-10">
            <span className="text-5xl">🛍️</span>
          </div>
        </div>
        <h2 className="font-heading font-bold text-xl text-[#282C3F] mb-2">Hey, it feels so light!</h2>
        <p className="text-gray-500 mb-8 max-w-sm">There is nothing in your bag. Let's add some items.</p>
        <Link href="/search" className="border border-[#FF3F6C] text-[#FF3F6C] font-bold px-12 py-3 rounded hover:bg-pink-50 transition-colors uppercase tracking-wider text-sm">
          Add items from wishlist
        </Link>
      </div>
    );
  }

  const totalMRP = bagItems.reduce((acc, item) => acc + (item.product.mrp * item.qty), 0);
  const totalDiscount = bagItems.reduce((acc, item) => acc + ((item.product.mrp - item.product.price) * item.qty), 0);
  const extraDiscount = appliedPromo ? 500 : 0;
  const deliveryFee = totalMRP - totalDiscount > 999 ? 0 : 99;
  const finalTotal = totalMRP - totalDiscount - extraDiscount + deliveryFee;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Left Column: Items */}
        <div className="w-full lg:w-[60%]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-bold text-lg text-[#282C3F]">
              Check Delivery Time & Services
            </h1>
            <Button variant="outline" size="sm" className="text-[#FF3F6C] border-[#FF3F6C]">ENTER PIN CODE</Button>
          </div>

          <div className="bg-white border rounded-sm mb-4 p-4 flex items-center gap-3">
            <Truck className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Yay! Free delivery on this order.</span>
          </div>

          <div className="space-y-4">
            <div className="font-bold text-lg text-[#282C3F] mb-4">
              {bagItems.reduce((a, b) => a + b.qty, 0)} Items Selected
            </div>
            
            {bagItems.map(item => (
              <div key={item.id} className="border rounded-sm p-4 relative flex gap-4 bg-white hover:shadow-sm transition-shadow">
                <button 
                  onClick={() => removeBagItem(item.id)}
                  className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="w-24 shrink-0 bg-gray-100">
                  <Link href={`/product/${item.productId}`}>
                    <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                  </Link>
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="pr-6">
                    <h3 className="font-bold text-[#282C3F]">{item.product.brand}</h3>
                    <p className="text-sm text-gray-500 truncate">{item.product.name}</p>
                  </div>

                  <div className="flex items-center gap-4 mt-2 mb-3">
                    <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-[#282C3F] flex items-center gap-1">
                      Size: {item.size}
                    </div>
                    <div className="flex items-center border rounded bg-gray-50">
                      <button 
                        className="px-2 py-1 hover:bg-gray-200"
                        onClick={() => updateBagItem(item.id, item.qty - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 py-1 text-xs font-bold w-6 text-center">{item.qty}</span>
                      <button 
                        className="px-2 py-1 hover:bg-gray-200"
                        onClick={() => updateBagItem(item.id, item.qty + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto font-mono flex items-center gap-2">
                    <span className="font-bold text-sm text-[#282C3F]">₹{item.product.price * item.qty}</span>
                    {item.product.discountPercent > 0 && (
                      <>
                        <span className="text-xs text-gray-500 line-through">₹{item.product.mrp * item.qty}</span>
                        <span className="text-xs font-bold text-[#FF3F6C]">{item.product.discountPercent}% OFF</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                    <Undo2 className="h-3 w-3" /> 14 days return available
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border rounded flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => setLocation('/search')}>
            <div className="flex items-center gap-2 font-bold text-sm">
              <Heart className="h-4 w-4 text-gray-500" /> Add More From Wishlist
            </div>
            <span className="text-xl">&rsaquo;</span>
          </div>
        </div>

        {/* Right Column: Price Details */}
        <div className="w-full lg:w-[40%] mt-8 lg:mt-0">
          <div className="border rounded-sm p-4 bg-white sticky top-24">
            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wide mb-4">Coupons</h3>
            
            {!appliedPromo ? (
              <div className="flex gap-2 mb-6">
                <Input 
                  placeholder="Enter promo code" 
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="font-mono uppercase"
                />
                <Button variant="outline" className="text-[#FF3F6C] font-bold" onClick={handleApplyPromo}>APPLY</Button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-6 flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-green-700 font-bold">
                  <ShieldCheck className="h-4 w-4" /> {appliedPromo} Applied
                </div>
                <button onClick={() => setAppliedPromo(null)} className="text-gray-500 hover:text-gray-800 font-bold text-xs">REMOVE</button>
              </div>
            )}

            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wide mb-4">Price Details ({bagItems.reduce((a, b) => a + b.qty, 0)} Items)</h3>
            
            <div className="space-y-3 text-sm text-[#282C3F] font-mono">
              <div className="flex justify-between">
                <span>Total MRP</span>
                <span>₹{totalMRP}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount on MRP</span>
                <span className="text-[#03A685]">-₹{totalDiscount}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between">
                  <span>Coupon Discount</span>
                  <span className="text-[#03A685]">-₹{extraDiscount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span className="text-[#03A685]">FREE</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Fee</span>
                {deliveryFee === 0 ? (
                  <span className="text-[#03A685]">FREE</span>
                ) : (
                  <span>₹{deliveryFee}</span>
                )}
              </div>
            </div>

            <div className="border-t my-4"></div>

            <div className="flex justify-between font-bold text-[15px] font-mono mb-6 text-[#282C3F]">
              <span>Total Amount</span>
              <span>₹{finalTotal}</span>
            </div>

            <Button 
              className="w-full bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold py-6 text-sm tracking-wider uppercase"
              onClick={() => setLocation('/checkout')}
            >
              Place Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
