import { useState } from 'react';
import { useRoute } from 'wouter';
import { useChallenge, useProducts } from '../hooks/use-catalog';
import { useIdentity } from '../hooks/use-identity';
import { useVoteChallengeEntry } from '../hooks/use-challenge-actions';
import { useVotedEntries } from '../hooks/use-voted-entries';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { SubmitLookModal } from '../components/SubmitLookModal';
import { SubmissionDetailModal } from '../components/SubmissionDetailModal';
import { Trophy, Clock, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { ChallengeEntry } from '../data/mock-data';

export default function ChallengeDetail() {
  const [, params] = useRoute('/challenges/:id');
  const { challenge, isLoading } = useChallenge(params?.id);
  const { products } = useProducts();
  const identity = useIdentity();
  const voteEntry = useVoteChallengeEntry(params?.id ?? '');
  const { hasVoted, markVoted } = useVotedEntries();
  const { toast } = useToast();

  const [submitOpen, setSubmitOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ChallengeEntry | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-heading text-2xl font-bold mb-4">Challenge Not Found</h1>
        <p className="text-gray-500">This challenge may have ended or the link is invalid.</p>
      </div>
    );
  }

  const endDate = new Date(challenge.endsAt);
  const isEndingSoon = endDate.getTime() - Date.now() < 86400000;
  const sortedEntries = [...challenge.entries].sort((a, b) => b.voteCount - a.voteCount);

  const handleVote = (entry: ChallengeEntry) => {
    if (!identity || hasVoted(entry.id)) return;
    voteEntry.mutate(
      { entryId: entry.id, voterId: identity.userId },
      {
        onSuccess: () => markVoted(entry.id),
        onError: (err) => {
          if ((err as Error).message === 'ALREADY_VOTED') {
            markVoted(entry.id);
            toast({ title: "You've already voted", description: 'One vote per person for this entry.' });
          } else {
            toast({ title: 'Could not vote', description: (err as Error).message, variant: 'destructive' });
          }
        },
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative rounded-2xl overflow-hidden h-56 flex items-end text-white mb-6">
        <img src="/img/blokecore-hub.jpg" alt="" className="absolute inset-0 w-full h-full object-cover brightness-[0.55]" />
        <div className="relative p-6">
          <h1 className="font-heading font-black text-3xl uppercase tracking-tight mb-2">{challenge.title}</h1>
          <p className="text-sm opacity-90 max-w-xl">{challenge.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <span className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-700 px-3 py-2 rounded-md text-xs font-bold">
          <Trophy className="h-3.5 w-3.5" /> {challenge.prizeText}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold border font-mono',
            isEndingSoon ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200',
          )}
        >
          <Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(endDate)} left
        </span>
        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 border border-gray-200 px-3 py-2 rounded-md text-xs font-bold">
          <Users className="h-3.5 w-3.5" /> {challenge.entries.length} submissions
        </span>
        <button
          onClick={() => setRulesOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-md text-xs font-bold"
        >
          <FileText className="h-3.5 w-3.5" /> Rules
        </button>
      </div>

      {rulesOpen && <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-sm rounded-lg p-4 mb-6">{challenge.rules}</div>}

      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 shadow-sm">
        <div>
          <p className="font-bold text-sm text-[#282C3F]">Think your look can win?</p>
          <p className="text-xs text-gray-500 mt-0.5">Submit one of your saved looks from My Looks to enter.</p>
        </div>
        <Button className="bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold shrink-0" onClick={() => setSubmitOpen(true)}>
          Submit Look
        </Button>
      </div>

      <h2 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-4">All submissions ({challenge.entries.length})</h2>

      {sortedEntries.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed text-gray-400">No submissions yet — be the first!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedEntries.map((entry, index) => {
            const voted = hasVoted(entry.id);
            const rankColor = index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : null;

            return (
              <div
                key={entry.id}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex aspect-[3/4] bg-gray-100 relative">
                  {rankColor && (
                    <span className={cn('absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center font-black text-xs text-white', rankColor)}>
                      #{index + 1}
                    </span>
                  )}
                  {entry.productIds.slice(0, 2).map((pid) => (
                    <img
                      key={pid}
                      src={products.find((p) => p.id === pid)?.images[0]}
                      alt=""
                      className="flex-1 w-full h-full object-contain border-l first:border-l-0 border-gray-200"
                    />
                  ))}
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm text-[#282C3F] truncate">{entry.creatorName}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2.5">
                    <span className="font-bold text-green-600">₹{entry.totalPrice.toLocaleString('en-IN')}</span>
                    <span>{formatDistanceToNow(new Date(entry.submittedAt), { addSuffix: true })}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(entry);
                      }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-md',
                        voted ? 'bg-pink-100 text-[#FF3F6C]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                      )}
                    >
                      ♥ {entry.voteCount}
                    </button>
                    <button className="flex-1 text-xs font-bold py-2 rounded-md border border-gray-200 text-[#282C3F]">Details</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubmitLookModal challengeId={submitOpen ? challenge.id : null} onOpenChange={(open) => setSubmitOpen(open)} />
      <SubmissionDetailModal entry={selectedEntry} challengeId={challenge.id} onOpenChange={(open) => !open && setSelectedEntry(null)} />
    </div>
  );
}
