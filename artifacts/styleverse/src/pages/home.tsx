import { ProductCard } from '../components/ProductCard';
import { useProducts, useHubs } from '../hooks/use-catalog';
import { Link } from 'wouter';
import { Sparkles, TrendingUp, Zap, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function Home() {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'start' });
  const { products, isLoading: productsLoading } = useProducts();
  const { hubs, isLoading: hubsLoading } = useHubs();

  // Fake viewer count that updates
  const [viewers, setViewers] = useState(1245);
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 5) - 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const categories = [
    { name: 'Men', image: '/img/men-tshirt.jpg' },
    { name: 'Women', image: '/img/women-dress.jpg' },
    { name: 'Footwear', image: '/img/sneakers.jpg' },
    { name: 'Accessories', image: '/img/sunglasses.jpg' },
    { name: 'Beauty', image: '/img/handbag.jpg' }
  ];

  const tileCategories = [
    { name: 'Ethnic Wear', query: 'Ethnic', image: '/img/cat-ethnic.jpg', discount: '50-80% OFF' },
    { name: 'Casual Wear', query: 'Casual', image: '/img/cat-casual.jpg', discount: '40-70% OFF' },
    { name: "Men's Activewear", query: 'Activewear', image: '/img/cat-mens-active.jpg', discount: '30-60% OFF' },
    { name: "Women's Activewear", query: 'Activewear', image: '/img/cat-womens-active.jpg', discount: '40-80% OFF' },
    { name: 'Western Wear', query: 'Western', image: '/img/cat-western.jpg', discount: 'MIN 50% OFF' },
    { name: 'Sportswear', query: 'Sports', image: '/img/cat-sportswear.jpg', discount: 'UP TO 70% OFF' },
    { name: 'Loungewear', query: 'Lounge', image: '/img/cat-loungewear.jpg', discount: '30-50% OFF' },
    { name: 'Innerwear', query: 'Innerwear', image: '/img/cat-innerwear.jpg', discount: 'MIN 40% OFF' },
    { name: 'Lingerie', query: 'Lingerie', image: '/img/cat-lingerie.jpg', discount: '50-70% OFF' },
    { name: 'Watches', query: 'Watches', image: '/img/cat-watches.jpg', discount: 'FLAT 60% OFF' },
    { name: 'Grooming', query: 'Grooming', image: '/img/cat-grooming.jpg', discount: 'UP TO 40% OFF' },
    { name: 'Beauty & Makeup', query: 'Beauty', image: '/img/cat-beauty.jpg', discount: '20-50% OFF' },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      {/* Promo Banner */}
      <div className="bg-[#FF3F6C] text-white text-center py-2 text-xs font-bold font-mono tracking-wider">
        FLAT 50-80% OFF ON TOP BRANDS | SHOP NOW
      </div>

      <main className="flex-1">
        {/* Promo Coupon Banner */}
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="bg-[#FFF3E8] rounded-xl flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 overflow-hidden relative shadow-sm border border-orange-100">
            <div className="flex flex-col z-10 text-center sm:text-left mb-4 sm:mb-0">
              <h3 className="font-heading font-black text-2xl sm:text-3xl text-[#282C3F] tracking-tight">Get 25% Off</h3>
              <p className="text-[#FF3F6C] font-bold text-lg">Up to ₹200 Off*</p>
            </div>
            
            <div className="z-10 flex flex-col items-center">
              <div className="bg-white rounded-full px-1 py-1 flex items-center shadow-sm border border-gray-100 pl-4 pr-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-3">Coupon Code</span>
                <div className="bg-[#FF3F6C] text-white font-mono font-bold text-sm px-4 py-1.5 rounded-full border border-dashed border-white">
                  STYLEVERSE25
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-2 font-medium">On Your First Order | T&C Apply</p>
            </div>
            
            {/* Decorative stylized % graphic on the right */}
            <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none hidden sm:block">
              <span className="font-heading font-black text-[140px] text-orange-900 leading-none">%</span>
            </div>
          </div>
        </div>

        {/* StyleVerse Teaser Strip */}
        <Link href="/hubs" className="bg-gradient-to-r from-purple-900 via-indigo-900 to-[#282C3F] text-white py-3 px-4 flex items-center justify-between group cursor-pointer mb-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-md text-yellow-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm tracking-wide">Enter StyleVerse Studio</h3>
              <p className="text-xs text-indigo-200 hidden sm:block">Curate looks, join challenges, explore hubs.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2 hidden sm:flex">
              {[1,2,3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border border-indigo-900 bg-gray-300 flex items-center justify-center text-[10px]">👤</div>
              ))}
            </div>
            <div className="text-xs font-mono bg-white/10 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              {viewers} active
            </div>
            <ChevronRight className="h-5 w-5 text-indigo-300 group-hover:text-white transition-colors" />
          </div>
        </Link>

        {/* Hero Carousel - simulated */}
        <div className="w-full bg-gray-100 aspect-[16/6] md:aspect-[21/6] relative overflow-hidden flex items-center justify-center group">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-transparent z-10" />
          <img src="/img/women-dress.jpg" className="absolute inset-0 w-full h-full object-cover object-top opacity-50 mix-blend-overlay" alt="Hero" />
          <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 text-white">
            <h2 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl tracking-tighter uppercase mb-2">Summer<br/><span className="text-[#FF3F6C]">Unleashed</span></h2>
            <p className="text-lg sm:text-xl font-medium max-w-sm mb-6 text-gray-200">The freshest styles for the season, curated just for you.</p>
            <Link href="/search" className="inline-block bg-white text-[#282C3F] font-bold px-8 py-3 rounded-sm hover:scale-105 transition-transform uppercase tracking-wider text-sm shadow-xl">
              Explore Collection
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 space-y-12">
          {/* Circular Categories */}
          <section>
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-4 sm:gap-6">
                {categories.map((cat, i) => (
                  <Link key={i} href={`/search?c=${encodeURIComponent(cat.name)}`} className="flex-[0_0_28%] sm:flex-[0_0_15%] flex flex-col items-center gap-2 group min-w-0">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-transparent group-hover:border-[#FF3F6C] transition-colors p-1 relative">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    </div>
                    <span className="font-bold text-sm text-[#282C3F] uppercase tracking-wide">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Shop by Category Grid */}
          <section className="pt-4 pb-8">
            <h2 className="font-heading font-black text-2xl sm:text-3xl uppercase tracking-tight text-[#282C3F] mb-8 text-center">
              Shop by Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {tileCategories.map((cat, i) => (
                <Link key={i} href={`/search?q=${encodeURIComponent(cat.query)}`} className="group flex flex-col items-center cursor-pointer">
                  <div className="w-full bg-[#FFF3E8] p-2 rounded-lg border border-[#FFE4D6] group-hover:border-[#FF3F6C] group-hover:shadow-md transition-all duration-300">
                    <div className="aspect-[4/5] w-full rounded-md overflow-hidden bg-gray-100 mb-3 relative">
                      <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="text-center pb-2">
                      <h3 className="font-bold text-sm text-[#282C3F] mb-1 group-hover:text-[#FF3F6C] transition-colors line-clamp-1" title={cat.name}>{cat.name}</h3>
                      <p className="text-[#FF3F6C] font-black text-[13px] mb-1">{cat.discount}</p>
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Shop Now</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Trending Now */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-bold text-xl sm:text-2xl uppercase tracking-wide flex items-center gap-2 text-[#282C3F]">
                <TrendingUp className="h-6 w-6 text-[#FF3F6C]" /> Trending Now
              </h2>
              <Link href="/search" className="text-sm font-bold text-[#FF3F6C] hover:underline uppercase">View All</Link>
            </div>
            {productsLoading ? (
              <div className="flex justify-center py-10"><Spinner className="size-8" /></div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.slice(0, 5).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            )}
          </section>

          {/* Style Hubs Highlight */}
          <section className="bg-gray-50 -mx-4 px-4 py-12 border-y">
            <div className="container mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <h2 className="font-heading font-black text-3xl uppercase tracking-tight text-[#282C3F] mb-4">Discover Your Aesthetic</h2>
                <p className="text-gray-600">Join communities of like-minded fashion lovers, participate in challenges, and shop complete looks crafted by top creators.</p>
              </div>
              {hubsLoading ? (
                <div className="flex justify-center py-10"><Spinner className="size-8" /></div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {hubs.map(hub => (
                  <Link key={hub.id} href={`/hubs/${hub.id}`} className="group block relative rounded-lg overflow-hidden aspect-[4/5] shadow-md hover:shadow-xl transition-all">
                    <img src={hub.coverImage} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={hub.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">#{hub.aestheticTag}</div>
                      <h3 className="font-heading font-bold text-xl text-white mb-2">{hub.name}</h3>
                      <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                        <span>{hub.memberCount.toLocaleString()} members</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              )}
            </div>
          </section>

          {/* Deals of the Day */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-bold text-xl sm:text-2xl uppercase tracking-wide flex items-center gap-2 text-[#282C3F]">
                <Zap className="h-6 w-6 text-orange-500" /> Deals of the Day
              </h2>
            </div>
            {productsLoading ? (
              <div className="flex justify-center py-10"><Spinner className="size-8" /></div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.filter(p => p.discountPercent > 50).slice(0, 5).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
