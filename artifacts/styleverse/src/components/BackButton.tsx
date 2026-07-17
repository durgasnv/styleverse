import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1.5 text-sm font-bold text-[#282C3F] hover:text-[#FF3F6C] transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
