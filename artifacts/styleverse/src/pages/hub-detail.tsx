import { useRoute, Link } from 'wouter';
import { useHubs, useProducts } from '../hooks/use-catalog';
import { Users, UserPlus, Flame, MessageCircle, Share2, Award, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo } from 'react';
import { ProductCard } from '../components/ProductCard';
import { Spinner } from '@/components/ui/spinner';

export default function HubDetail() {
  const [, params] = useRoute('/hubs/:id');
  const { hubs, isLoading: hubsLoading } = useHubs();
  const { products, isLoading: productsLoading } = useProducts();
  const hub = hubs.find(h => h.id === params?.id);
  const [joined, setJoined] = useState(false);

  const [viewers, setViewers] = useState(hub?.baseViewerCount || 0);
  useEffect(() => {
    if (!hub) return;
    const interval = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 3) - 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [hub]);

  // Products actually tagged for this aesthetic, padded with other products only if
  // there aren't enough matches. Deterministic and memoized so it doesn't reshuffle
  // every time the viewer-count interval above triggers a re-render.
  const matchingProducts = useMemo(() => {
    if (!hub) return [];
    const tagged = products.filter(p =>
      p.description.toLowerCase().includes(hub.aestheticTag) ||
      p.occasionTags.includes(hub.aestheticTag)
    );
    if (tagged.length >= 8) return tagged.slice(0, 8);
    const fillers = products.filter(p => !tagged.includes(p)).slice(0, 8 - tagged.length);
    return [...tagged, ...fillers];
  }, [hub, products]);

  if (hubsLoading) return <div className="flex justify-center py-16"><Spinner className="size-8" /></div>;
  if (!hub) return <div className="p-8 text-center">Hub not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Header */}
      <div className="relative h-[30vh] md:h-[40vh] bg-black">
        <img src={hub.coverImage} className="w-full h-full object-cover opacity-60" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 z-10">
          <Link href="/hubs" className="bg-white/20 backdrop-blur hover:bg-white/40 text-white p-2 rounded-full inline-flex transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="text-white">
              <div className="bg-[#FF3F6C] inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded-sm mb-3">
                #{hub.aestheticTag}
              </div>
              <h1 className="font-heading font-black text-4xl md:text-5xl mb-2">{hub.name}</h1>
              <p className="text-gray-300 max-w-xl text-sm md:text-base">{hub.description}</p>
            </div>
            
            <div className="flex items-center gap-4 bg-gray-900/60 backdrop-blur-md p-4 rounded-xl border border-white/10 shrink-0">
              <div className="text-center px-4 border-r border-white/20">
                <div className="text-xl font-mono font-bold text-white">{hub.memberCount.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Members</div>
              </div>
              <div className="text-center px-4">
                <div className="text-xl font-mono font-bold text-[#03A685] flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#03A685] animate-pulse"></span>
                  {viewers}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Active Now</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Main Feed */}
          <div className="flex-1 space-y-8">
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <Button 
                className={`font-bold w-full sm:w-auto ${joined ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-[#FF3F6C] text-white hover:bg-[#d93059]'}`}
                onClick={() => setJoined(!joined)}
              >
                {joined ? 'Joined' : <><UserPlus className="w-4 h-4 mr-2" /> Join Community</>}
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none"><MessageCircle className="w-4 h-4 mr-2"/> Discuss</Button>
                <Button variant="outline" className="flex-1 sm:flex-none"><Share2 className="w-4 h-4 mr-2"/> Share</Button>
              </div>
            </div>

            {/* Weekly Challenge Banner */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-6 text-white relative overflow-hidden group cursor-pointer shadow-md">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                <Award className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-yellow-300 text-xs font-bold uppercase tracking-wider mb-2">
                  <Flame className="w-4 h-4" /> Challenge of the week
                </div>
                <h3 className="font-heading font-black text-2xl md:text-3xl mb-2">{hub.weeklyChallenge}</h3>
                <p className="text-indigo-200 text-sm mb-4 max-w-md">Submit your best look matching this theme. Top 3 highest voted outfits win exclusive Myntra credit and profile badges.</p>
                <Link href="/challenges" className="inline-block bg-white text-indigo-900 font-bold text-sm px-6 py-2 rounded uppercase tracking-wider hover:bg-gray-100 transition-colors">
                  View Submissions
                </Link>
              </div>
            </div>

            {/* Trending Looks / Shop */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading font-bold text-2xl uppercase tracking-tight text-[#282C3F]">Trending in {hub.name}</h2>
              </div>
              {productsLoading ? (
                <div className="flex justify-center py-10"><Spinner className="size-8" /></div>
              ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {matchingProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-4 border-b pb-2">Top Creators</h3>
              <div className="space-y-4">
                {hub.topCreators.map((creator, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-400 to-orange-400 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
                        {creator.name.replace('@', '').substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#282C3F]">{creator.name}</div>
                        <div className="text-xs text-gray-500">{(1000 - i * 200)} pts</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[#FF3F6C] h-7 text-xs font-bold px-2">Follow</Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-5 border border-dashed border-gray-300 text-center">
              <Sparkles className="w-8 h-8 mx-auto text-gray-400 mb-3" />
              <h3 className="font-bold text-[#282C3F] mb-1">Have a look to share?</h3>
              <p className="text-xs text-gray-500 mb-4">Create an outfit in the Style Canvas and share it here to gain points.</p>
              <Link href="/canvas" className="block w-full bg-[#282C3F] text-white text-sm font-bold py-2 rounded text-center">
                Open Canvas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
