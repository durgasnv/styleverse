import { useHubs } from '../hooks/use-catalog';
import { Link } from 'wouter';
import { Users, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function Hubs() {
  const { hubs, isLoading } = useHubs();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-black text-3xl uppercase tracking-tight text-[#282C3F] flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-[#FF3F6C]" /> Style Hubs
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl">Find your aesthetic. Join communities of creators, discover trending looks, and shop curation tailored to your vibe.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold">My Communities</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="size-8" /></div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hubs.map(hub => (
          <Link key={hub.id} href={`/hubs/${hub.id}`} className="group bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
            <div className="relative aspect-[16/10] overflow-hidden">
              <img src={hub.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={hub.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-sm border border-white/30 uppercase tracking-wider">
                #{hub.aestheticTag}
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h2 className="font-heading font-black text-2xl mb-1">{hub.name}</h2>
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <p className="text-sm text-gray-600 mb-4 flex-1">{hub.description}</p>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                <div className="text-xs font-bold text-[#FF3F6C] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Weekly Challenge
                </div>
                <div className="font-medium text-sm text-[#282C3F] truncate">{hub.weeklyChallenge}</div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono border-t pt-4">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Users className="h-4 w-4" /> {hub.memberCount.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-[#03A685]">
                  <span className="w-2 h-2 rounded-full bg-[#03A685] animate-pulse"></span>
                  {hub.baseViewerCount + Math.floor(Math.random() * 50)} active
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
