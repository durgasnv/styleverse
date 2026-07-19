import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BODY_TYPES, requestTryon, type BodyTypeOption } from '../lib/tryon-api';

const LOADING_MESSAGES = [
  'Draping the fabric…',
  'Matching the fit to your body type…',
  'Adjusting the silhouette…',
  'Almost there — final touches…',
];

export function TryOnDialog({ productId, productName, children }: {
  productId: string;
  productName: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [bodyType, setBodyType] = useState<BodyTypeOption['id']>('m');
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  // Results per body type for this product, so switching back is instant.
  const resultsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!isLoading) return;
    setLoadingStep(0);
    const timer = setInterval(() => {
      setLoadingStep(step => Math.min(step + 1, LOADING_MESSAGES.length - 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [isLoading]);

  const generate = async (type: BodyTypeOption['id']) => {
    setBodyType(type);
    setError(null);
    const cached = resultsRef.current[type];
    if (cached) {
      setResultUrl(cached);
      return;
    }
    setIsLoading(true);
    setResultUrl(null);
    try {
      const { imageUrl } = await requestTryon({ productId, bodyType: type });
      resultsRef.current[type] = imageUrl;
      setResultUrl(imageUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const selected = BODY_TYPES.find(b => b.id === bodyType)!;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#FF3F6C]" /> Virtual Try-On
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <h4 className="font-bold uppercase text-xs tracking-wider text-gray-500 mb-2">Choose a body type</h4>
            <div className="flex gap-2">
              {BODY_TYPES.map(type => {
                const isSelected = bodyType === type.id;
                return (
                  <button
                    key={type.id}
                    disabled={isLoading}
                    onClick={() => generate(type.id)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 rounded-md border p-2 transition-all',
                      isSelected ? 'border-[#FF3F6C] bg-pink-50' : 'border-gray-200 hover:border-[#FF3F6C]',
                      isLoading && 'opacity-50 cursor-not-allowed',
                    )}
                    data-testid={`tryon-body-${type.id}`}
                  >
                    <span className={cn('font-bold text-sm font-mono', isSelected ? 'text-[#FF3F6C]' : 'text-[#282C3F]')}>{type.label}</span>
                    <span className="text-[10px] text-gray-500">{type.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="aspect-[3/4] bg-gray-100 rounded-md overflow-hidden relative">
            {resultUrl ? (
              <img src={resultUrl} alt={`${productName} on ${selected.description} body type`} className="w-full h-full object-cover" />
            ) : isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-100 to-pink-50 animate-pulse">
                <Sparkles className="h-8 w-8 text-[#FF3F6C] animate-bounce" />
                <p className="text-sm text-gray-600 font-medium px-6 text-center">{LOADING_MESSAGES[loadingStep]}</p>
                <p className="text-xs text-gray-400">Usually takes 10–20 seconds</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <img
                  src={selected.modelImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
                <p className="relative text-sm text-gray-600">
                  See <span className="font-bold">{productName}</span> on a {selected.description.toLowerCase()} body type.
                </p>
                <Button
                  className="relative bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold"
                  onClick={() => generate(bodyType)}
                  data-testid="tryon-generate"
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Try It On
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center justify-between gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => generate(bodyType)}>
                <RefreshCw className="h-4 w-4 mr-1" /> Retry
              </Button>
            </div>
          )}

          <p className="text-[10px] text-gray-400 text-center">
            AI-generated preview — actual fit may vary. Check the size chart before ordering.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
