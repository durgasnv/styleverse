import { useChallenges } from '../hooks/use-catalog';
import { useStore } from '../hooks/use-store';
import { Button } from '@/components/ui/button';
import { Clock, Trophy, Heart, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';

export default function Challenges() {
  const { state, voteChallenge } = useStore();
  const { challenges, isLoading } = useChallenges();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="font-heading font-black text-3xl md:text-4xl uppercase tracking-tight text-[#282C3F] mb-3">
          Fashion Challenges
        </h1>
        <p className="text-gray-500">Compete with your saved looks, vote for your favorites, and win exclusive prizes and StyleVerse badges.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="size-8" /></div>
      ) : (
      <div className="space-y-12">
        {challenges.map((challenge, i) => {
          const endDate = new Date(challenge.endsAt);
          const isEndingSoon = endDate.getTime() - Date.now() < 86400000; // less than 24h

          return (
            <div key={challenge.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading font-black text-2xl text-[#282C3F] mb-1">{challenge.title}</h2>
                  <p className="text-sm text-gray-600 max-w-xl">{challenge.description}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                  <div className="bg-orange-50 border border-orange-100 text-orange-700 px-3 py-2 rounded-md flex items-center gap-2 text-sm font-bold">
                    <Trophy className="h-4 w-4" /> {challenge.prizeText}
                  </div>
                  <div className={cn("flex items-center gap-2 text-sm font-bold font-mono px-3 py-2 rounded-md border", isEndingSoon ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-gray-600")}>
                    <Clock className="h-4 w-4" /> 
                    {formatDistanceToNow(endDate, { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">Top Entries</h3>
                  <Button variant="outline" size="sm" className="font-bold text-[#FF3F6C] border-[#FF3F6C] hover:bg-pink-50">
                    Submit Your Look
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {challenge.entries.map((entry, index) => {
                    const hasVoted = state.challengeVotes[entry.id];
                    // Calculate a dynamic vote count that increases slightly over time based on ID
                    const displayVotes = entry.baseVoteCount + (hasVoted ? 1 : 0);

                    return (
                      <div key={entry.id} className="border rounded-lg overflow-hidden group">
                        <div className="aspect-[4/5] bg-gray-100 relative p-4 flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                          {/* Collage representation of the outfit */}
                          <div className="relative w-full h-full flex items-center justify-center">
                            <div className="absolute top-4 left-4 w-24 h-32 bg-white p-1 shadow-md -rotate-6 transition-transform group-hover:rotate-0 z-10 border border-gray-200">
                              <img src={`/img/${entry.productIds[0] === 'p1' ? 'men-tshirt.jpg' : 'women-dress.jpg'}`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="absolute bottom-4 right-4 w-20 h-24 bg-white p-1 shadow-md rotate-6 transition-transform group-hover:rotate-12 z-20 border border-gray-200">
                              <img src={`/img/${entry.productIds[1] === 'p3' ? 'sneakers.jpg' : 'handbag.jpg'}`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-30">
                              <div className="bg-black/50 text-white px-3 py-1 rounded backdrop-blur-sm text-xs font-bold flex items-center">
                                View Look <ArrowUpRight className="h-3 w-3 ml-1" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Rank badge */}
                          {index < 3 && (
                            <div className={cn("absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shadow-sm z-40", 
                              index === 0 ? "bg-yellow-400" : index === 1 ? "bg-gray-400" : "bg-orange-400"
                            )}>
                              #{index + 1}
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3 bg-white border-t flex items-center justify-between">
                          <div className="font-bold text-sm text-[#282C3F] truncate pr-2">{entry.creatorName}</div>
                          <button 
                            onClick={() => voteChallenge(entry.id)}
                            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-colors", 
                              hasVoted ? "bg-pink-100 text-[#FF3F6C]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                          >
                            <Heart className={cn("h-3 w-3", hasVoted && "fill-[#FF3F6C]")} />
                            {displayVotes}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
