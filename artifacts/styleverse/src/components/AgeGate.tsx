import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from './ui/button';
import { ShieldAlert } from 'lucide-react';

const KEY = 'styleverse_age_ack';

export function hasAgeAck(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

function ackAge() {
  try {
    localStorage.setItem(KEY, 'true');
  } catch {
    // localStorage unavailable (e.g. privacy mode) — the gate will just re-prompt next time.
  }
}

export function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const [, setLocation] = useLocation();
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-8 text-center">
          <h2 className="font-heading font-black text-xl text-[#282C3F] mb-2">Sorry about that</h2>
          <p className="text-sm text-gray-500 mb-6">
            You need to be 18 or older to view this voting room.
          </p>
          <Button onClick={() => setLocation('/')} className="w-full bg-[#282C3F] hover:bg-black text-white">
            Back to StyleVerse
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-6 w-6 text-white" />
        </div>
        <h2 className="font-heading font-black text-xl text-[#282C3F] mb-2">Age confirmation</h2>
        <p className="text-sm text-gray-500 mb-6">
          This voting room may show AI-generated photos and comments from other people. You must be 18 or older to continue.
        </p>
        <div className="space-y-2">
          <Button
            onClick={() => {
              ackAge();
              onConfirm();
            }}
            className="w-full bg-[#FF3F6C] hover:bg-[#d93059] text-white"
          >
            I'm 18 or older — Continue
          </Button>
          <Button variant="outline" onClick={() => setDeclined(true)} className="w-full">
            I'm under 18
          </Button>
        </div>
      </div>
    </div>
  );
}
