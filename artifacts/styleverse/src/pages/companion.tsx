import { useLocation } from 'wouter';
import { useProducts } from '../hooks/use-catalog';
import { useStore } from '../hooks/use-store';
import { useLooks } from '../hooks/use-looks';
import { useIdentity } from '../hooks/use-identity';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Wand2, Search, SlidersHorizontal, CheckCircle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { FindAlternativesModal } from '../components/FindAlternativesModal';
import { computeColorHarmonyScore } from '../lib/color-theory';
import { computeMoodMatchScore } from '../lib/mood-match';
import type { Product } from '../data/mock-data';

const PRESET_MOODS = ['confident', 'relaxed', 'bold', 'romantic'];

export default function Companion() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const lookId = searchParams.get('lookId');
  // Canvas's "Ask Companion" links here with ?items=<id,id,...> for a draft
  // that hasn't been saved as a look yet — take priority over lookId/dummy fallback.
  const itemsParam = searchParams.get('items');
  const { state, updatePrefs } = useStore();
  const { products: allProducts, isLoading } = useProducts();
  const identity = useIdentity();
  const { looks, isLoading: looksLoading } = useLooks(identity?.userId);
  const { toast } = useToast();

  const [mood, setMood] = useState(state.prefs.mood);
  const [customMood, setCustomMood] = useState(() => (PRESET_MOODS.includes(state.prefs.mood) ? '' : state.prefs.mood));
  const [weather, setWeather] = useState(state.prefs.weather);
  const [skinTone, setSkinTone] = useState(state.prefs.skinTone);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [mentorTip, setMentorTip] = useState<string | null>(null);
  const [mentorTipLoading, setMentorTipLoading] = useState(false);
  const [mentorTipError, setMentorTipError] = useState<string | null>(null);
  const [mentorTipRetryToken, setMentorTipRetryToken] = useState(0);
  // originalProductId -> replacementProductId. Session-only: never persisted
  // to the saved Look or the Canvas draft. Reset whenever the look/draft
  // being analyzed changes, so a stale swap can't bleed into a new outfit.
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [alternativesModalOpen, setAlternativesModalOpen] = useState(false);

  // If no look/items are provided, we can either prompt them to select one or just use a dummy one for the demo
  const look = lookId ? looks.find(l => l.id === lookId) : (!itemsParam ? looks[0] : undefined);

  const rawProducts = itemsParam
    ? itemsParam.split(',').filter(Boolean).map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts
    : look
    ? look.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts
    : [];

  const products = rawProducts.map((p) => {
    const replacementId = swaps[p.id];
    if (!replacementId) return p;
    return allProducts.find((candidate) => candidate.id === replacementId) ?? p;
  });

  const lookName = look?.name ?? 'Your Canvas Look';

  const handleSwap = useCallback(
    (originalId: string, replacement: Product) => {
      setSwaps((prev) => ({ ...prev, [originalId]: replacement.id }));
      setAlternativesModalOpen(false);
      toast({ title: 'Look updated', description: `Swapped in ${replacement.name} — outfit re-scored.` });
    },
    [toast],
  );

  const handleAnalyze = () => {
    updatePrefs({ mood, weather, skinTone });
    setIsAnalyzing(true);
    setShowResults(false);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 1500);
  };

  useEffect(() => {
    setSwaps({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookId, itemsParam]);

  useEffect(() => {
    if (products.length === 0) return;

    const controller = new AbortController();
    setMentorTipLoading(true);
    setMentorTipError(null);

    fetch('/api/companion/mentor-tip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        items: products.map(p => ({
          name: p.name,
          brand: p.brand,
          category: p.category,
          colors: p.colors,
          occasionTags: p.occasionTags,
        })),
        mood,
        weather,
        skinTone,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Request failed (${res.status})`);
        return res.json();
      })
      .then((data: { tip: string }) => setMentorTip(data.tip))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setMentorTipError(err.message || 'The style mentor is temporarily busy — please tap Retry in a moment.');
      })
      .finally(() => setMentorTipLoading(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.map(p => p.id).join(','), mood, weather, skinTone, mentorTipRetryToken]);

  const retryMentorTip = useCallback(() => setMentorTipRetryToken(t => t + 1), []);

  // Deterministic fake scoring algorithm based on categories and selections
  const analysisData = useMemo(() => {
    if (products.length === 0) return null;

    const categories = new Set(products.map(p => p.category));
    const colors = products.flatMap(p => p.colors);
    const occasions = products.flatMap(p => p.occasionTags);
    const totalPrice = products.reduce((sum, p) => sum + p.price, 0);
    
    // Color Harmony uses real color-wheel relationships (analogous/complementary
    // vs. clashing hues) plus a seasonal-color-analysis undertone bonus — see
    // lib/color-theory.ts. The other three axes are still simple heuristics.
    let colorScore = computeColorHarmonyScore(products.map(p => p.colors), skinTone);

    let styleScore = 50 + (categories.size * 10); // More categories = better put together
    if (categories.has('Footwear')) styleScore += 10;
    if (categories.has('Accessories')) styleScore += 5;

    let occasionScore = 70;
    if (weather === 'rainy' && !occasions.includes('monsoon')) occasionScore -= 20;
    if (weather === 'sunny' && occasions.includes('summer')) occasionScore += 20;
    
    let moodScore = computeMoodMatchScore(products.map(p => p.occasionTags), products.map(p => p.colors), mood);

    // Cap at 100
    colorScore = Math.min(100, colorScore);
    styleScore = Math.min(100, styleScore);
    occasionScore = Math.min(100, occasionScore);
    moodScore = Math.min(100, moodScore);

    const overallScore = Math.round((colorScore + styleScore + occasionScore + moodScore) / 4);

    return {
      overallScore,
      radarData: [
        { subject: 'Color Harmony', A: colorScore, fullMark: 100 },
        { subject: 'Style Cohesion', A: styleScore, fullMark: 100 },
        { subject: 'Occasion Fit', A: occasionScore, fullMark: 100 },
        { subject: 'Mood Match', A: moodScore, fullMark: 100 },
        { subject: 'Completeness', A: Math.min(100, categories.size * 25), fullMark: 100 },
      ],
      missing: !categories.has('Footwear') ? 'footwear' : !categories.has('Accessories') ? 'an accessory' : null,
      priciest: [...products].sort((a,b) => b.price - a.price)[0]
    };
  }, [products, mood, weather, skinTone]);

  if (isLoading || looksLoading) {
    return <div className="flex justify-center py-16"><Spinner className="size-8" /></div>;
  }

  if (products.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
          <Wand2 className="h-10 w-10 text-indigo-500" />
        </div>
        <h1 className="font-heading font-black text-3xl mb-2 text-[#282C3F]">AI Style Companion</h1>
        <p className="text-gray-500 mb-8 max-w-md">Create a look in the Style Canvas or select an existing saved look to get personalized style scoring and advice.</p>
        <div className="flex gap-4">
          <Button onClick={() => setLocation('/canvas')} className="bg-[#282C3F] text-white">Go to Canvas</Button>
          <Button onClick={() => setLocation('/my-looks')} variant="outline">Browse My Looks</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white pt-10 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64 -mt-10 -mr-10" />
        </div>
        <div className="container mx-auto max-w-5xl relative z-10">
          <h1 className="font-heading font-black text-3xl md:text-4xl mb-2 flex items-center gap-3">
            <Wand2 className="h-8 w-8 text-indigo-300" /> Style Companion
          </h1>
          <p className="text-indigo-200">Analyzing: <span className="font-bold text-white">{lookName}</span></p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-16 relative z-20">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Controls Panel */}
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-bold text-[#282C3F] mb-4 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" /> Context Settings
              </h3>
              
              <div className="space-y-5 text-sm">
                <div>
                  <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Vibe / Mood</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRESET_MOODS.map(m => (
                      <button
                        key={m}
                        onClick={() => { setMood(m); setCustomMood(''); }}
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold capitalize transition-colors ${mood === m ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={customMood}
                    onChange={(e) => setCustomMood(e.target.value)}
                    onBlur={() => { if (customMood.trim()) setMood(customMood.trim()); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customMood.trim()) {
                        e.preventDefault();
                        setMood(customMood.trim());
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Or describe your own mood..."
                    className="w-full px-3 py-1.5 rounded-md border text-xs font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Weather</label>
                  <div className="flex flex-wrap gap-2">
                    {['sunny', 'rainy', 'cold', 'humid'].map(w => (
                      <button 
                        key={w} 
                        onClick={() => setWeather(w)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold capitalize transition-colors ${weather === w ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Skin Tone Context</label>
                  <div className="flex gap-2">
                    {['light', 'medium', 'dark', 'cool', 'warm'].map(s => (
                      <button 
                        key={s} 
                        onClick={() => setSkinTone(s)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${skinTone === s ? 'scale-110 border-indigo-500' : 'border-transparent hover:scale-105'} 
                          ${s === 'light' ? 'bg-[#fcd3b6]' : s === 'medium' ? 'bg-[#d09e72]' : s === 'dark' ? 'bg-[#5c3826]' : s === 'cool' ? 'bg-[#f4d0c8]' : 'bg-[#e5a073]'}`}
                        title={s}
                      />
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleAnalyze} 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold mt-2"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}
                </Button>
              </div>
            </div>

            {/* The Outfit itself */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-bold text-[#282C3F] mb-3 text-sm">Outfit Items ({products.length})</h3>
              <div className="flex flex-wrap gap-2">
                {products.map(p => (
                  <div key={p.id} className="w-16 h-16 rounded bg-gray-100 overflow-hidden border">
                    <img src={p.images[0]} className="w-full h-full object-cover" alt="" title={p.name} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="w-full lg:w-2/3">
            {isAnalyzing ? (
              <div className="bg-white rounded-xl shadow-sm border h-full min-h-[400px] flex flex-col items-center justify-center text-indigo-500">
                <Sparkles className="h-12 w-12 animate-spin-slow mb-4" />
                <p className="font-bold font-mono">Running style algorithms...</p>
              </div>
            ) : showResults && analysisData ? (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 border-b">
                  <div className="text-center md:text-left">
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Companion Score</div>
                    <div className="flex items-baseline justify-center md:justify-start gap-1 font-heading font-black text-6xl text-[#282C3F]">
                      {analysisData.overallScore} <span className="text-2xl text-gray-400">/ 100</span>
                    </div>
                    <p className="text-sm mt-3 text-gray-600 max-w-xs">
                      {analysisData.overallScore >= 80 ? "Stunning combination! This look is highly cohesive." :
                       analysisData.overallScore >= 60 ? "Solid foundation. A few tweaks could make it pop." :
                       "A bit mismatched. Let's look at the breakdown."}
                    </p>
                  </div>
                  
                  <div className="h-[250px] w-full md:flex-1 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysisData.radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-6 md:p-8 bg-indigo-50/30">
                  <h3 className="font-bold text-[#282C3F] mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500" /> Stylist Recommendations
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded flex items-start gap-3">
                      <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center shrink-0"><Sparkles className="h-4 w-4" /></div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">Mentor Tip</p>
                        {mentorTipLoading ? (
                          <p className="text-xs text-indigo-100 mt-1 flex items-center gap-2"><Spinner className="size-3" /> Your style mentor is thinking...</p>
                        ) : mentorTipError ? (
                          <div className="mt-1">
                            <p className="text-xs text-indigo-100">{mentorTipError}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs mt-2 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                              onClick={retryMentorTip}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : mentorTip ? (
                          <p className="text-xs text-indigo-100 mt-1">{mentorTip}</p>
                        ) : null}
                      </div>
                    </div>

                    {analysisData.missing && (
                      <div className="bg-white p-4 rounded border border-indigo-100 flex items-start gap-3">
                        <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                        <div>
                          <p className="text-sm font-bold text-[#282C3F]">Missing {analysisData.missing}</p>
                          <p className="text-xs text-gray-600 mt-1 mb-2">Adding {analysisData.missing} would make this a complete, ready-to-wear outfit.</p>
                          <Button variant="outline" size="sm" className="h-7 text-xs border-indigo-200 text-indigo-600" onClick={() => setLocation('/search')}>Shop {analysisData.missing}</Button>
                        </div>
                      </div>
                    )}
                    
                    {analysisData.priciest && (
                      <div className="bg-white p-4 rounded border border-green-100 flex items-start gap-3">
                        <div className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                        <div>
                          <p className="text-sm font-bold text-[#282C3F]">Upgrade Opportunity</p>
                          <p className="text-xs text-gray-600 mt-1 mb-2">Swapping in a better-matching piece will make this outfit look even better.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-green-200 text-green-600"
                            onClick={() => setAlternativesModalOpen(true)}
                          >
                            Find better alternatives
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white p-4 rounded border flex items-start gap-3">
                      <div className="bg-pink-100 text-[#FF3F6C] w-8 h-8 rounded-full flex items-center justify-center shrink-0"><CheckCircle className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-bold text-[#282C3F]">Ready for Challenges</p>
                        <p className="text-xs text-gray-600 mt-1 mb-2">This look is strong enough to compete. Submit it to an active fashion challenge!</p>
                        <Button size="sm" className="h-7 text-xs bg-[#FF3F6C] hover:bg-[#d93059] text-white" onClick={() => setLocation('/challenges')}>View Challenges</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <FindAlternativesModal
        priciest={alternativesModalOpen ? (analysisData?.priciest ?? null) : null}
        allProducts={allProducts}
        currentOutfitIds={products.map((p) => p.id)}
        onSwap={handleSwap}
        onOpenChange={setAlternativesModalOpen}
      />
    </div>
  );
}
