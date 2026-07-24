import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useIdentity } from '../hooks/use-identity';
import { useLooks } from '../hooks/use-looks';
import { useProducts } from '../hooks/use-catalog';
import { useSubmitChallengeEntry } from '../hooks/use-challenge-actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SubmitLookModal({
  challengeId,
  onOpenChange,
}: {
  challengeId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const identity = useIdentity();
  const { looks, isLoading: looksLoading } = useLooks(identity?.userId);
  const { products } = useProducts();
  const submitEntry = useSubmitChallengeEntry(challengeId ?? '');
  const { toast } = useToast();
  const [selectedLookId, setSelectedLookId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!challengeId || !identity || !selectedLookId) return;
    const look = looks.find((l) => l.id === selectedLookId);
    if (!look) return;

    submitEntry.mutate(
      { productIds: look.productIds, creatorName: identity.username, creatorId: identity.userId },
      {
        onSuccess: () => {
          toast({ title: 'Look submitted!', description: `${look.name} is now in the running.` });
          setSelectedLookId(null);
          onOpenChange(false);
        },
        onError: (err) => {
          toast({ title: 'Could not submit look', description: (err as Error).message, variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Dialog open={challengeId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit a Look</DialogTitle>
        </DialogHeader>

        {looksLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-6" />
          </div>
        ) : looks.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            You don't have any saved looks yet. Head to the Style Canvas to design one first.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto py-2">
            {looks.map((look) => (
              <button
                key={look.id}
                onClick={() => setSelectedLookId(look.id)}
                className={cn(
                  'border-2 rounded-lg p-2 text-left transition-colors',
                  selectedLookId === look.id ? 'border-[#FF3F6C] bg-pink-50' : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <div className="flex gap-1 mb-2">
                  {look.productIds.slice(0, 2).map((pid) => (
                    <img
                      key={pid}
                      src={products.find((p) => p.id === pid)?.images[0]}
                      alt=""
                      className="flex-1 aspect-square object-cover rounded bg-gray-100"
                    />
                  ))}
                </div>
                <p className="text-xs font-bold text-[#282C3F] truncate">{look.name}</p>
              </button>
            ))}
          </div>
        )}

        <Button
          className="w-full bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold"
          disabled={!selectedLookId || submitEntry.isPending}
          onClick={handleSubmit}
        >
          {submitEntry.isPending ? 'Submitting...' : 'Submit This Look'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
