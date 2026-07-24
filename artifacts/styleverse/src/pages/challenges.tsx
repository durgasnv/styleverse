import { useState } from 'react';
import { Link } from 'wouter';
import { useChallenges, useProducts } from '../hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import { SubmitLookModal } from '../components/SubmitLookModal';
import type { Challenge } from '../data/mock-data';

export default function Challenges() {
  const { challenges, isLoading } = useChallenges();
  const { products } = useProducts();
  const [submitChallengeId, setSubmitChallengeId] = useState<string | null>(null);

  const productImage = (productId: string) => products.find((p) => p.id === productId)?.images[0];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge: Challenge) => {
            const endDate = new Date(challenge.endsAt);
            const isEndingSoon = endDate.getTime() - Date.now() < 86400000;
            const topEntries = [...challenge.entries].sort((a, b) => b.voteCount - a.voteCount).slice(0, 3);
            const extraCount = challenge.entries.length - topEntries.length;

            return (
              <div
                key={challenge.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex aspect-[3/4] bg-gray-100 relative">
                  {isEndingSoon && (
                    <span className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full">
                      Ending soon
                    </span>
                  )}
                  {topEntries.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No entries yet</div>
                  ) : (
                    topEntries.map((entry) => (
                      <img
                        key={entry.id}
                        src={productImage(entry.productIds[0])}
                        alt=""
                        className="flex-1 w-full h-full object-contain bg-gray-100 border-l first:border-l-0 border-gray-200"
                      />
                    ))
                  )}
                  {extraCount > 0 && (
                    <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[11px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                      +{extraCount} more
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2.5 flex-1">
                  <h2 className="font-heading font-black text-lg text-[#282C3F] leading-tight">{challenge.title}</h2>
                  <p className="text-xs text-gray-500 min-h-[32px]">{challenge.description}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-100 text-orange-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
                      <Trophy className="h-3 w-3" /> {challenge.prizeText}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border font-mono',
                        isEndingSoon ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200',
                      )}
                    >
                      <Clock className="h-3 w-3" /> {formatDistanceToNow(endDate)} left
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-md text-[11px] font-bold">
                      <Users className="h-3 w-3" /> {challenge.entries.length} entries
                    </span>
                  </div>

                  <div className="flex gap-2 mt-auto pt-2">
                    <Link href={`/challenges/${challenge.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full font-bold text-[#FF3F6C] border-[#FF3F6C] hover:bg-pink-50">
                        View Challenge
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="flex-1 font-bold bg-[#FF3F6C] hover:bg-[#d93059] text-white"
                      onClick={() => setSubmitChallengeId(challenge.id)}
                    >
                      Submit Look
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubmitLookModal challengeId={submitChallengeId} onOpenChange={(open) => !open && setSubmitChallengeId(null)} />
    </div>
  );
}
