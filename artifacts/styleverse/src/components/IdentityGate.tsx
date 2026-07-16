import { useState } from 'react';
import { useIdentity, identify } from '../hooks/use-identity';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles } from 'lucide-react';

export function IdentityGate() {
  const identity = useIdentity();
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (identity) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await identify(trimmed);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h2 className="font-heading font-black text-xl text-[#282C3F] mb-2">Welcome to StyleVerse</h2>
        <p className="text-sm text-gray-500 mb-6">
          Pick a display name — it's how you'll show up when you save looks, vote, and share.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. priya_styles"
            maxLength={40}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button
            type="submit"
            disabled={submitting || !username.trim()}
            className="w-full bg-[#FF3F6C] hover:bg-[#d93059] text-white"
          >
            {submitting ? 'Continuing...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
