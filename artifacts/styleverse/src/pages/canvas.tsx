import { useState, useRef, useEffect, useMemo } from 'react';
import type { Product } from '../data/mock-data';
import { useProducts } from '../hooks/use-catalog';
import { useStore } from '../hooks/use-store';
import { useLocation, useSearch } from 'wouter';
import { useTryOn, MAX_TRYON_GARMENTS } from '../hooks/use-tryon';
import { PRESET_MODELS } from '../data/preset-models';
import { fileToResizedDataUrl } from '../lib/image-utils';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  CheckCircle,
  Wand2,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Share2,
  Sparkles,
  Upload,
  Download,
  RotateCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createVotingRoom } from '../lib/voting-api';
import { useIdentity } from '../hooks/use-identity';
import { useSaveLook } from '../hooks/use-looks';

interface CanvasItem {
  id: string; // unique ID for this instance on canvas
  product: Product;
  x: number;
  y: number;
  z: number;
}

type StudioMode = 'canvas' | 'tryon';

export default function Canvas() {
  const { addToBag } = useStore();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { products: allProducts } = useProducts();
  const identity = useIdentity();
  const saveLook = useSaveLook(identity?.userId);
  const {
    baseImage,
    resultImage,
    isGenerating,
    generateError,
    imgRef: tryOnImgRef,
    selectPresetModel,
    selectUploadedPhoto,
    generateTryOn,
    resetBaseImage,
  } = useTryOn();

  const [items, setItems] = useState<CanvasItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  // Driven by the URL (not local state) so the page's existing Back button
  // (plain browser history) naturally exits try-on mode back to the canvas —
  // entering try-on pushes a history entry instead of a separate toggle.
  const mode: StudioMode = new URLSearchParams(search).get('tryon') === '1' ? 'tryon' : 'canvas';
  const [tryOnImgAspect, setTryOnImgAspect] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const tryOnFileInputRef = useRef<HTMLInputElement>(null);
  const [draggedItem, setDraggedItem] = useState<{id: string, isFromCatalog: boolean} | null>(null);
  const [highestZ, setHighestZ] = useState(1);
  const [isSharing, setIsSharing] = useState(false);

  // The outfit currently on the canvas, deduped by product — this is what
  // both "Shop All"/"Save Look" and Try On operate on, so the outfit stays
  // a single source of truth regardless of which view is showing.
  const uniqueProducts = useMemo(() => {
    const byId = new Map<string, Product>();
    items.forEach((item) => byId.set(item.product.id, item.product));
    return Array.from(byId.values());
  }, [items]);

  // "Open in Canvas" / "Try It On" from the product page link here with
  // ?add=<productId> (and ?tryon=1 for the latter) — pick it up once
  // products have loaded and drop it onto the canvas.
  const appliedAddParam = useRef<string | null>(null);
  useEffect(() => {
    const addId = new URLSearchParams(search).get('add');
    if (!addId || addId === appliedAddParam.current || allProducts.length === 0) return;

    const product = allProducts.find(p => p.id === addId);
    if (!product) return;

    appliedAddParam.current = addId;
    setHighestZ(z => {
      setItems(prev => [...prev, {
        id: `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        product,
        x: 60,
        y: 60,
        z: z + 1,
      }]);
      return z + 1;
    });
  }, [search, allProducts]);

  const categories = ['All', ...Array.from(new Set(allProducts.map(p => p.category)))];

  const filteredProducts = allProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  // Drag handlers for catalog items
  const handleDragStartCatalog = (e: React.DragEvent, product: Product) => {
    setDraggedItem({ id: product.id, isFromCatalog: true });
    // This is required for Firefox
    e.dataTransfer.setData('text/plain', product.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Drag handlers for canvas items
  const handleDragStartCanvas = (e: React.DragEvent, id: string) => {
    setDraggedItem({ id, isFromCatalog: false });

    // Bring to front
    const newZ = highestZ + 1;
    setHighestZ(newZ);
    setItems(items.map(item => item.id === id ? { ...item, z: newZ } : item));

    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Canvas drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedItem?.isFromCatalog ? 'copy' : 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current || !draggedItem) return;

    const rect = canvasRef.current.getBoundingClientRect();

    // Try to center the image on the cursor (assuming ~100px width image)
    const x = e.clientX - rect.left - 50;
    const y = e.clientY - rect.top - 75;

    if (draggedItem.isFromCatalog) {
      const product = allProducts.find(p => p.id === draggedItem.id);
      if (product) {
        const newItem: CanvasItem = {
          id: `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          product,
          x: Math.max(0, Math.min(x, rect.width - 100)),
          y: Math.max(0, Math.min(y, rect.height - 150)),
          z: highestZ + 1
        };
        setHighestZ(highestZ + 1);
        setItems([...items, newItem]);
      }
    } else {
      setItems(items.map(item => {
        if (item.id === draggedItem.id) {
          return {
            ...item,
            x: Math.max(0, Math.min(x, rect.width - 100)),
            y: Math.max(0, Math.min(y, rect.height - 150))
          };
        }
        return item;
      }));
    }
    setDraggedItem(null);
  };

  const removeItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems(items.filter(i => i.id !== id));
  };

  const handleSaveLook = async () => {
    if (items.length === 0) {
      toast({ title: "Canvas is empty", description: "Add some items before saving.", variant: "destructive" });
      return;
    }
    if (!identity) return;

    const uniqueProductIds = uniqueProducts.map(p => p.id);
    const lookName = `Look ${new Date().toLocaleDateString()}`;

    try {
      await saveLook.mutateAsync({ name: lookName, productIds: uniqueProductIds });
      toast({
        title: "Look Saved!",
        description: "You can find this in My Looks.",
        action: <Button variant="outline" size="sm" onClick={() => setLocation('/my-looks')}>View</Button>
      });
    } catch (err) {
      toast({ title: "Could not save look", description: (err as Error).message, variant: "destructive" });
    }
  };

  const checkWithCompanion = () => {
    if (items.length === 0) {
      toast({ title: "Canvas is empty", description: "Add some items to get advice.", variant: "destructive" });
      return;
    }
    // Pass the draft directly via the URL instead of persisting it to My Looks —
    // checking with the companion shouldn't silently create a saved look.
    const uniqueProductIds = uniqueProducts.map(p => p.id);
    setLocation(`/companion?items=${uniqueProductIds.join(',')}`);
  };

  const shareForVoting = async () => {
    if (items.length === 0) {
      toast({ title: "Canvas is empty", description: "Add some items before sharing for votes.", variant: "destructive" });
      return;
    }
    if (!identity) return;
    const uniqueProductIds = uniqueProducts.map(p => p.id);
    setIsSharing(true);
    try {
      const room = await createVotingRoom({ productIds: uniqueProductIds, creatorVoterId: identity.userId });
      setLocation(`/vote/${room.id}`);
    } catch (err) {
      toast({ title: "Could not create voting room", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  const addAllToBag = () => {
    if (items.length === 0) return;

    uniqueProducts.forEach(product => {
      // Pick first available size as default for one-click add
      const availableSize = product.sizes.find(s => s.inStock)?.label || 'One Size';
      addToBag(product.id, availableSize, 1);
    });

    toast({
      title: "Added to Bag",
      description: `${uniqueProducts.length} items added to your bag.`,
      action: <Button variant="outline" size="sm" onClick={() => setLocation('/bag')}>View Bag</Button>
    });
  };

  const handleTryOnFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const resized = await fileToResizedDataUrl(file);
      selectUploadedPhoto(resized);
    } catch (err) {
      toast({ title: "Could not use that photo", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleTryOnImageLoad = () => {
    const img = tryOnImgRef.current;
    if (img && img.naturalWidth && img.naturalHeight) {
      setTryOnImgAspect(img.naturalWidth / img.naturalHeight);
    }
  };

  useEffect(() => {
    setTryOnImgAspect(null);
  }, [baseImage?.src]);

  const handleGenerateTryOn = () => {
    if (uniqueProducts.length > MAX_TRYON_GARMENTS) {
      toast({
        title: `Only the first ${MAX_TRYON_GARMENTS} items will be used`,
        description: "Remove some items from the canvas to try on the rest.",
      });
    }
    generateTryOn(uniqueProducts.map(p => ({ name: `${p.brand} ${p.name}`, image: p.images[0] })));
  };

  const handleDownloadTryOn = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = 'try-on.png';
    a.click();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Top Toolbar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between gap-3 z-10 shrink-0">
        <h1 className="font-heading font-black text-xl flex items-center gap-2 text-[#282C3F] shrink-0">
          Style Canvas
        </h1>
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar hide-scrollbar">
          <Button variant="outline" size="sm" onClick={() => setItems([])} disabled={items.length === 0} className="shrink-0 hidden sm:flex">
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={addAllToBag} disabled={items.length === 0} className="shrink-0 border-gray-300 hidden md:flex">
            <ShoppingBag className="w-4 h-4 mr-2" /> Shop All
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveLook} disabled={items.length === 0 || saveLook.isPending} className="shrink-0 border-[#FF3F6C] text-[#FF3F6C] hover:bg-pink-50">
            <CheckCircle className="w-4 h-4 mr-2" /> {saveLook.isPending ? 'Saving...' : 'Save Look'}
          </Button>
          <Button variant="outline" size="sm" onClick={shareForVoting} disabled={items.length === 0 || isSharing} className="shrink-0 border-indigo-200 text-indigo-600 hidden sm:flex">
            <Share2 className="w-4 h-4 mr-2" /> {isSharing ? 'Sharing...' : 'Share for Voting'}
          </Button>
          <Button size="sm" onClick={checkWithCompanion} disabled={items.length === 0} className="shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none">
            <Wand2 className="w-4 h-4 mr-2" /> Ask Companion
          </Button>
          {mode === 'tryon' && baseImage && (
            <>
              <Button variant="outline" size="sm" onClick={resetBaseImage} className="shrink-0">
                <RotateCcw className="w-4 h-4 mr-2" /> Change Model
              </Button>
              {resultImage && (
                <Button variant="outline" size="sm" onClick={handleDownloadTryOn} className="shrink-0">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              )}
              <Button
                size="sm"
                className="shrink-0 bg-[#FF3F6C] hover:bg-[#e0305a] text-white"
                onClick={handleGenerateTryOn}
                disabled={uniqueProducts.length === 0 || isGenerating}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating…' : resultImage ? 'Regenerate' : 'Generate AI Try-On'}
              </Button>
            </>
          )}
          {mode === 'canvas' && (
            <Button
              size="sm"
              onClick={() => setLocation('/canvas?tryon=1')}
              disabled={items.length === 0}
              className="shrink-0 bg-[#FF3F6C] hover:bg-[#e0305a] text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Try On
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Catalog Panel */}
        <div className="w-1/3 md:w-80 border-r bg-gray-50 flex flex-col shrink-0">
          <div className="p-3 border-b bg-white space-y-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search products..."
                className="pl-9 bg-gray-100 border-transparent text-sm h-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar hide-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold transition-colors ${activeCategory === cat ? 'bg-[#282C3F] text-white' : 'bg-white border text-gray-600 hover:border-gray-400'}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                draggable={mode === 'canvas'}
                onDragStart={(e) => handleDragStartCatalog(e, product)}
                className={`bg-white rounded border border-transparent hover:border-[#FF3F6C] p-1 group aspect-[3/4] flex flex-col ${mode === 'canvas' ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <div className="flex-1 bg-gray-100 rounded-sm overflow-hidden pointer-events-none">
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" draggable={false} />
                </div>
                <div className="p-1 mt-1 shrink-0 pointer-events-none">
                  <div className="text-[10px] font-bold truncate text-[#282C3F]">{product.brand}</div>
                  <div className="text-[10px] font-mono text-gray-500">₹{product.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {mode === 'canvas' ? (
          /* Right Canvas Area */
          <div
            className="flex-1 bg-[#FAFAFA] relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"
            ref={canvasRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {items.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-4 bg-white/50">
                  <SlidersHorizontal className="w-10 h-10 text-gray-300" />
                </div>
                <p className="font-bold text-[#282C3F] mb-1">Your canvas is empty</p>
                <p className="text-sm">Drag and drop items from the catalog here to build an outfit.</p>
              </div>
            )}

            {items.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStartCanvas(e, item.id)}
                className="absolute cursor-move group touch-none"
                style={{
                  left: item.x,
                  top: item.y,
                  zIndex: item.z,
                  width: 120, // fixed display width on canvas
                }}
              >
                <div className="relative rounded-md shadow-sm border border-transparent hover:border-[#FF3F6C] hover:shadow-lg transition-shadow bg-white overflow-hidden">
                  <img
                    src={item.product.images[0]}
                    alt=""
                    className="w-full aspect-[3/4] object-cover pointer-events-none"
                    draggable={false}
                  />

                  <button
                    onClick={(e) => removeItem(item.id, e)}
                    className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity z-10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Try On stage — replaces the canvas area while active */
          <div className="flex-1 bg-[#FAFAFA] relative overflow-hidden flex flex-col">
            {!baseImage ? (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
                <h2 className="font-heading font-black text-lg text-[#282C3F] mb-2">Choose a model</h2>
                <p className="text-gray-500 text-sm mb-6">Pick a model to preview your outfit on, or upload your own photo.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-xl mx-auto">
                  {PRESET_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => selectPresetModel(model.id, model.image)}
                      className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-[#FF3F6C] transition-colors bg-gray-100"
                    >
                      <img src={model.image} alt={model.alt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <input ref={tryOnFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleTryOnFileChange} />
                <Button variant="outline" onClick={() => tryOnFileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Upload your own photo
                </Button>
              </div>
            ) : (
              <>
                {generateError && (
                  <div className="bg-red-50 border-b border-red-200 text-red-600 text-sm px-4 py-2 flex items-center justify-between shrink-0">
                    <span>{generateError}</span>
                    <button onClick={handleGenerateTryOn} className="font-bold underline shrink-0 ml-3">
                      Retry
                    </button>
                  </div>
                )}

                <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                  <div className="relative h-full max-h-full bg-white shadow-sm" style={{ aspectRatio: tryOnImgAspect ?? 3 / 4 }}>
                    <img
                      ref={tryOnImgRef}
                      src={resultImage ?? baseImage.src}
                      alt={resultImage ? 'AI-generated try-on result' : ''}
                      className="w-full h-full object-contain"
                      crossOrigin={resultImage ? undefined : 'anonymous'}
                      onLoad={handleTryOnImageLoad}
                    />

                    {isGenerating && (
                      <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2 z-20">
                        <Sparkles className="w-6 h-6 text-[#FF3F6C] animate-pulse" />
                        <p className="text-sm font-bold text-[#282C3F]">Generating your AI try-on…</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected garments tray */}
                <div className="border-t bg-white px-4 py-3 shrink-0">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Selected items {uniqueProducts.length > 0 && `(${uniqueProducts.length})`}
                    {uniqueProducts.length > MAX_TRYON_GARMENTS && ` — only first ${MAX_TRYON_GARMENTS} used`}
                  </p>
                  {uniqueProducts.length === 0 ? (
                    <p className="text-sm text-gray-400">Drag items onto the canvas to try them on.</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {uniqueProducts.map(product => (
                        <div key={product.id} className="relative shrink-0 w-16 group">
                          <div className="w-16 h-20 rounded border bg-gray-100 overflow-hidden">
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>
                          <button
                            onClick={() => setItems(prev => prev.filter(i => i.product.id !== product.id))}
                            className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-1 shadow-md border text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
