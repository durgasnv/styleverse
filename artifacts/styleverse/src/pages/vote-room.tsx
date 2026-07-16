import { useEffect, useRef, useState } from 'react';
import { useRoute } from 'wouter';
import { io, type Socket } from 'socket.io-client';
import { useProducts } from '../hooks/use-catalog';
import { useIdentity } from '../hooks/use-identity';
import { fetchVotingRoom, type Reaction, type Tally, type VotingRoom } from '../lib/voting-api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Users, Link as LinkIcon, Check } from 'lucide-react';

const REACTIONS: { key: Reaction; emoji: string; label: string }[] = [
  { key: 'fire', emoji: '🔥', label: 'Fire' },
  { key: 'yes', emoji: '👍', label: 'Yes' },
  { key: 'nah', emoji: '👎', label: 'Nah' },
];

export default function VoteRoom() {
  const [, params] = useRoute('/vote/:roomId');
  const roomId = params?.roomId;
  const identity = useIdentity();
  const userId = identity?.userId;
  const { products: allProducts, isLoading: productsLoading } = useProducts();

  const [room, setRoom] = useState<VotingRoom | null>(null);
  const [tally, setTally] = useState<Tally>({ fire: 0, yes: 0, nah: 0 });
  const [totalVoters, setTotalVoters] = useState(0);
  const [myReaction, setMyReaction] = useState<Reaction | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [presence, setPresence] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    fetchVotingRoom(roomId, userId)
      .then((data) => {
        if (cancelled) return;
        setRoom(data.room);
        setTally(data.tally);
        setTotalVoters(data.totalVoters);
        setMyReaction(data.myReaction);
        setIsCreator(data.isCreator);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, userId]);

  useEffect(() => {
    if (!roomId) return;

    const socket = io({ path: '/api/socket.io' });
    socketRef.current = socket;

    socket.emit('voting:join', { roomId });
    socket.on('voting:tally', (data: { tally: Tally; totalVoters: number }) => {
      setTally(data.tally);
      setTotalVoters(data.totalVoters);
    });
    socket.on('voting:presence', (data: { count: number }) => {
      setPresence(Math.max(1, data.count));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const castVote = (reaction: Reaction) => {
    if (!roomId || !userId || isCreator) return;
    setMyReaction(reaction);
    socketRef.current?.emit('voting:cast', { roomId, voterId: userId, reaction });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || productsLoading) {
    return <div className="flex justify-center py-16"><Spinner className="size-8" /></div>;
  }

  if (notFound || !room) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-heading text-2xl font-bold mb-4">Voting Room Not Found</h1>
        <p className="text-gray-500">This link may be invalid or the room no longer exists.</p>
      </div>
    );
  }

  const products = room.productIds.map((id) => allProducts.find((p) => p.id === id)).filter(Boolean) as typeof allProducts;
  const totalReactions = tally.fire + tally.yes + tally.nah;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white pt-10 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <h1 className="font-heading font-black text-3xl md:text-4xl mb-2">{room.creatorLabel}</h1>
          <div className="flex items-center gap-4 text-indigo-200 text-sm">
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {presence} watching live</span>
            <span>{totalReactions} reaction{totalReactions === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 -mt-10 relative z-10">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {products.map((p) => (
              <div key={p.id} className="w-24 rounded overflow-hidden border bg-gray-100">
                <img src={p.images[0]} className="w-full aspect-[3/4] object-cover" alt={p.name} title={p.name} />
              </div>
            ))}
          </div>

          {isCreator && (
            <p className="text-center text-sm text-gray-500 mb-4">
              This is your look — share the link so others can react. You can't vote on your own look.
            </p>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            {REACTIONS.map(({ key, emoji, label }) => (
              <button
                key={key}
                onClick={() => castVote(key)}
                disabled={isCreator}
                className={`flex flex-col items-center gap-1 py-4 rounded-xl border-2 transition-all ${
                  isCreator
                    ? 'border-gray-100 opacity-50 cursor-not-allowed'
                    : myReaction === key
                      ? 'border-[#FF3F6C] bg-pink-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-3xl">{emoji}</span>
                <span className="text-xs font-bold text-gray-600">{label}</span>
                <span className="font-mono font-bold text-lg text-[#282C3F]">{tally[key]}</span>
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={copyLink} className="w-full">
            {copied ? <><Check className="w-4 h-4 mr-2" /> Copied!</> : <><LinkIcon className="w-4 h-4 mr-2" /> Copy Link to Share</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
