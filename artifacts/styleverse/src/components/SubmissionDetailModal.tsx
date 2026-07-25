import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProducts } from '../hooks/use-catalog';
import { useIdentity } from '../hooks/use-identity';
import { useStore } from '../hooks/use-store';
import { useVoteChallengeEntry } from '../hooks/use-challenge-actions';
import { useVotedEntries } from '../hooks/use-voted-entries';
import { createVotingRoom } from '../lib/voting-api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChallengeEntry } from '../data/mock-data';

export function SubmissionDetailModal({
  entry,
  challengeId,
  onOpenChange,
}: {
  entry: ChallengeEntry | null;
  challengeId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { products } = useProducts();
  const identity = useIdentity();
  const { toggleWishlist } = useStore();
  const voteEntry = useVoteChallengeEntry(challengeId);
  const { hasVoted, markVoted } = useVotedEntries();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (!entry) return null;

  const items = entry.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const voted = hasVoted(entry.id);

  const handleVote = () => {
    if (!identity || voted) return;
    voteEntry.mutate(
      { entryId: entry.id, voterId: identity.userId },
      {
        onSuccess: () => markVoted(entry.id),
        onError: (err) => {
          if ((err as Error).message === 'ALREADY_VOTED') {
            markVoted(entry.id);
          } else {
            toast({ title: 'Could not vote', description: (err as Error).message, variant: 'destructive' });
          }
        },
      },
    );
  };

  const handleSave = () => {
    entry.productIds.forEach((id) => toggleWishlist(id));
    toast({ title: 'Saved to wishlist', description: `${entry.productIds.length} item(s) added.` });
  };

  const handleShare = async () => {
    if (!identity) return;
    try {
      const room = await createVotingRoom({
        productIds: entry.productIds,
        creatorLabel: `${entry.creatorName}'s entry`,
        creatorVoterId: identity.userId,
      });
      setLocation(`/vote/${room.id}`);
    } catch (err) {
      toast({ title: 'Could not share', description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-0 p-0 overflow-hidden">
        <div className="bg-gray-100 flex items-center justify-center p-5 gap-2 h-[420px] sm:h-auto overflow-hidden">
          {items.slice(0, 2).map((item) => (
            <img key={item.id} src={item.images[0]} alt={item.name} className="flex-1 min-w-0 max-h-full object-contain rounded bg-white" />
          ))}
        </div>

        <div className="p-6 flex flex-col">
          <p className="font-black text-sm text-[#282C3F] mb-1">{entry.creatorName}</p>
          <p className="text-xs text-gray-400 mb-4">Submitted {format(new Date(entry.submittedAt), 'MMM d, yyyy')}</p>

          <div className="flex flex-col gap-3 mb-4 flex-1 overflow-y-auto max-h-56">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <img src={item.images[0]} alt="" className="w-11 h-11 rounded-lg object-cover bg-gray-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold uppercase text-gray-400">{item.brand}</p>
                  <p className="text-xs font-semibold text-[#282C3F] truncate">{item.name}</p>
                </div>
                <p className="text-xs font-extrabold text-[#282C3F]">₹{item.price.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-dashed pt-3 mb-4">
            <span className="text-xs font-bold text-gray-500">Total outfit cost</span>
            <span className="text-lg font-black text-green-600">₹{entry.totalPrice.toLocaleString('en-IN')}</span>
          </div>

          <p className="text-xs font-bold text-gray-500 mb-4">♥ {entry.voteCount} votes</p>

          <div className="flex gap-2 mt-auto">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleSave}>
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn('flex-1 border-[#FF3F6C] text-[#FF3F6C]', voted && 'bg-pink-50')}
              disabled={voted}
              onClick={handleVote}
            >
              {voted ? 'Voted' : 'Vote'}
            </Button>
            <Button size="sm" className="flex-1 bg-[#FF3F6C] hover:bg-[#d93059] text-white" onClick={handleShare}>
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
