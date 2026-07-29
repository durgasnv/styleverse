import { useState, useRef, useEffect, useMemo } from 'react';
import type { Product } from '../data/mock-data';
import { useProducts } from '../hooks/use-catalog';
import { useStore } from '../hooks/use-store';
import { useLocation, useSearch } from 'wouter';
import { useTryOn, MAX_TRYON_GARMENTS, type RecentTryOnResult } from '../hooks/use-tryon';
import { subcategoryToRegion } from '../lib/garment-region';
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
  ChevronsLeftRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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

function downloadImage(dataUrl: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'try-on.png';
  a.click();
}

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
    fitNote,
    isGenerating,
    generateError,
    recentResults,
    imgRef: tryOnImgRef,
    selectPresetModel,
    selectUploadedPhoto,
    generateTryOn,
    resetBaseImage,
  } = useTryOn();

  const [items, setItems] = useState<CanvasItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubcategory, setActiveSubcategory] = useState('All');
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

  // Second-level filter shown once a top-level category (e.g. Women) is picked,
  // so the grid doesn't dump every subcategory (tops, dresses, trousers...)
  // into one confusing list — this is the actual item type within that category.
  const subcategories = activeCategory === 'All'
    ? []
    : ['All', ...Array.from(new Set(allProducts.filter(p => p.category === activeCategory).map(p => p.subcategory)))];

  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat);
    setActiveSubcategory('All');
  };

  const filteredProducts = allProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === 'All' || p.category === activeCategory;
    const matchesSubcat = activeSubcategory === 'All' || p.subcategory === activeSubcategory;
    return matchesSearch && matchesCat && matchesSubcat;
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

  // Lets you drag a new catalog item straight onto the try-on stage (image
  // area or the selected-items tray) to add it to the outfit without leaving
  // try-on mode — unlike handleDrop, there's no canvas position to compute,
  // items here aren't placed, just added to the outfit set.
  const handleDropOnTryOnStage = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem?.isFromCatalog) {
      setDraggedItem(null);
      return;
    }
    const product = allProducts.find(p => p.id === draggedItem.id);
    if (product) {
      const newItem: CanvasItem = {
        id: `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        product,
        x: 60,
        y: 60,
        z: highestZ + 1,
      };
      setHighestZ(highestZ + 1);
      setItems(prev => [...prev, newItem]);
    }
    setDraggedItem(null);
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
      const room = await createVotingRoom({
        productIds: uniqueProductIds,
        // Include the AI try-on render when one's been generated for this
        // outfit, so voters see the look on a person, not just flat items.
        tryOnImage: mode === 'tryon' ? resultImage ?? undefined : undefined,
        creatorVoterId: identity.userId,
      });
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

  const [comparePos, setComparePos] = useState(50);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setComparePos(50);
  }, [resultImage]);

  const updateComparePos = (clientX: number) => {
    const rect = compareContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setComparePos(Math.min(100, Math.max(0, pct)));
  };

  const handleComparePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateComparePos(e.clientX);
  };

  const handleComparePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    updateComparePos(e.clientX);
  };

  const handleGenerateTryOn = () => {
    if (uniqueProducts.length > MAX_TRYON_GARMENTS) {
      toast({
        title: `Only the first ${MAX_TRYON_GARMENTS} items will be used`,
        description: "Remove some items from the canvas to try on the rest.",
      });
    }
    generateTryOn(uniqueProducts.map(p => ({ name: `${p.brand} ${p.name}`, image: p.images[0], region: subcategoryToRegion(p.subcategory) })));
  };

  const handleDownloadTryOn = () => {
    if (!resultImage) return;
    downloadImage(resultImage);
  };

  const [lightboxResult, setLightboxResult] = useState<RecentTryOnResult | null>(null);
  const [lightboxFromGallery, setLightboxFromGallery] = useState(false);
  const lightboxIndex = lightboxResult
    ? recentResults.findIndex((r) => r.timestamp === lightboxResult.timestamp)
    : -1;
  const [showAllResults, setShowAllResults] = useState(false);

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
        {/* Left Catalog Panel — narrower in try-on mode so the result image gets more room */}
        <div className={`${mode === 'tryon' ? 'w-1/4 md:w-56' : 'w-1/3 md:w-80'} border-r bg-gray-50 flex flex-col shrink-0 transition-[width]`}>
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
                  onClick={() => handleSelectCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            {subcategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar hide-scrollbar">
                {subcategories.map(subcat => (
                  <button
                    key={subcat}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${activeSubcategory === subcat ? 'border-[#FF3F6C] text-[#FF3F6C] bg-pink-50' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
                    onClick={() => setActiveSubcategory(subcat)}
                  >
                    {subcat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                draggable
                onDragStart={(e) => handleDragStartCatalog(e, product)}
                className="bg-white rounded border border-transparent hover:border-[#FF3F6C] p-1 group aspect-[3/4] flex flex-col cursor-grab active:cursor-grabbing"
              >
                <div className="flex-1 bg-gray-100 rounded-sm overflow-hidden pointer-events-none">
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" draggable={false} />
                </div>
                <div className="p-1 mt-1 shrink-0 pointer-events-none">
                  <div className="text-[10px] font-bold truncate text-[#282C3F]">{product.brand}</div>
                  <div className="text-[10px] text-gray-500 truncate">{product.name}</div>
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
          <div
            className="flex-1 bg-[#FAFAFA] relative overflow-hidden flex flex-col"
            onDragOver={handleDragOver}
            onDrop={handleDropOnTryOnStage}
          >
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

                <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2">
                  <div
                    ref={compareContainerRef}
                    className="relative h-full max-h-full max-w-full bg-white shadow-sm select-none"
                    style={{ aspectRatio: tryOnImgAspect ?? 3 / 4 }}
                  >
                    {resultImage ? (
                      <>
                        <img
                          ref={tryOnImgRef}
                          src={resultImage}
                          alt="AI-generated try-on result"
                          className="absolute inset-0 w-full h-full object-contain"
                          onLoad={handleTryOnImageLoad}
                        />
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ clipPath: `inset(0 ${100 - comparePos}% 0 0)` }}
                        >
                          <img
                            src={baseImage.src}
                            alt="Original photo"
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                        </div>
                        <div
                          onPointerDown={handleComparePointerDown}
                          onPointerMove={handleComparePointerMove}
                          className="absolute inset-y-0 w-6 -ml-3 flex items-center justify-center cursor-ew-resize touch-none z-10"
                          style={{ left: `${comparePos}%` }}
                        >
                          <div className="absolute inset-y-0 w-0.5 bg-white shadow" />
                          <div className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center">
                            <ChevronsLeftRight className="w-4 h-4 text-[#282C3F]" />
                          </div>
                        </div>
                        <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide bg-black/60 text-white px-2 py-0.5 rounded">
                          Before
                        </span>
                        <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wide bg-black/60 text-white px-2 py-0.5 rounded">
                          After
                        </span>
                      </>
                    ) : (
                      <img
                        ref={tryOnImgRef}
                        src={baseImage.src}
                        alt=""
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                        onLoad={handleTryOnImageLoad}
                      />
                    )}

                    {isGenerating && (
                      <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2 z-20">
                        <Sparkles className="w-6 h-6 text-[#FF3F6C] animate-pulse" />
                        <p className="text-sm font-bold text-[#282C3F]">Generating your AI try-on…</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Capped so these panels can never crowd out the result image above —
                    the image area keeps at least ~65% of the stage height regardless
                    of how much fit-note/history/tray content stacks up. */}
                <div className="shrink-0 max-h-[26vh] overflow-y-auto">
                  {!isGenerating && resultImage && fitNote && (
                    <div className="border-t bg-pink-50 px-4 py-3">
                      <p className="text-xs font-bold text-[#FF3F6C] uppercase tracking-wide mb-1">AI Fit Note</p>
                      <p className="text-sm text-[#282C3F]">{fitNote}</p>
                      <button
                        onClick={checkWithCompanion}
                        className="text-xs font-bold text-indigo-600 hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" /> Ask the Style Companion for more advice
                      </button>
                    </div>
                  )}

                  {recentResults.length > 0 && (
                    <div className="border-t bg-white px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Recently tried on</p>
                        {recentResults.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShowAllResults(true)}
                            className="text-xs font-bold text-[#FF3F6C] hover:underline"
                          >
                            View all
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {recentResults.map((r) => (
                          <button
                            key={r.timestamp}
                            type="button"
                            onClick={() => {
                              setLightboxFromGallery(false);
                              setLightboxResult(r);
                            }}
                            title="View this look"
                            className="relative flex-1 max-w-16 aspect-[2/3] rounded border bg-gray-100 overflow-hidden block group"
                          >
                            <img src={r.image} alt="Past try-on result" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>
        )}

        {mode === 'tryon' && baseImage && (
          /* Selected garments rail — also a drop target so dragging a new
             item here adds it to the outfit without leaving try-on mode. */
          <div
            className="w-1/4 md:w-56 border-l bg-gray-50 flex flex-col shrink-0 overflow-y-auto"
            onDragOver={handleDragOver}
            onDrop={handleDropOnTryOnStage}
          >
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-3 pt-3 pb-2">
              Selected items {uniqueProducts.length > 0 && `(${uniqueProducts.length})`}
              {uniqueProducts.length > MAX_TRYON_GARMENTS && ` — only first ${MAX_TRYON_GARMENTS} used`}
            </p>
            {uniqueProducts.length === 0 ? (
              <p className="text-sm text-gray-400 px-3">Drag items here to try them on.</p>
            ) : (
              <div className="flex flex-col gap-2 px-3 pb-3">
                {uniqueProducts.map(product => (
                  <div key={product.id} className="relative flex items-center gap-2 group bg-white rounded border p-1.5">
                    <div className="w-12 h-16 shrink-0 rounded border bg-gray-100 overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-[#282C3F] truncate">{product.brand}</p>
                      <p className="text-[11px] text-gray-500 truncate">{product.name}</p>
                    </div>
                    <button
                      onClick={() => setItems(prev => prev.filter(i => i.product.id !== product.id))}
                      className="shrink-0 bg-white rounded-full p-1 shadow-sm border text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showAllResults} onOpenChange={setShowAllResults}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogTitle>All your try-ons</DialogTitle>
          <div
            className="grid gap-3 pt-1"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
          >
            {recentResults.map((r) => (
              <button
                key={r.timestamp}
                type="button"
                onClick={() => {
                  setShowAllResults(false);
                  setLightboxFromGallery(true);
                  setLightboxResult(r);
                }}
                title="View this look"
                className="relative aspect-[2/3] rounded border bg-gray-100 overflow-hidden block group"
              >
                <img src={r.image} alt="Past try-on result" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxResult} onOpenChange={(open) => !open && setLightboxResult(null)}>
        <DialogContent className="max-w-2xl p-2 bg-black/95 border-none">
          {lightboxResult && (
            <div className="flex flex-col items-center gap-3">
              <DialogTitle className="sr-only">Try-on result, full size</DialogTitle>
              <div className="relative w-full flex items-center justify-center">
                {lightboxIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setLightboxResult(recentResults[lightboxIndex - 1])}
                    title="Previous try-on"
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <img
                  src={lightboxResult.image}
                  alt="Past try-on result, full size"
                  className="max-h-[75vh] w-auto rounded object-contain"
                />
                {lightboxIndex >= 0 && lightboxIndex < recentResults.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setLightboxResult(recentResults[lightboxIndex + 1])}
                    title="Next try-on"
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
              {lightboxResult.fitNote && (
                <p className="text-sm text-white/90 text-center max-w-md px-2">{lightboxResult.fitNote}</p>
              )}
              <div className="flex gap-2">
                {lightboxFromGallery && (
                  <Button
                    size="sm"
                    className="w-32 justify-center bg-white text-[#282C3F] hover:bg-gray-200"
                    onClick={() => {
                      setLightboxResult(null);
                      setShowAllResults(true);
                    }}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                )}
                <Button
                  size="sm"
                  className="w-32 justify-center bg-white text-[#282C3F] hover:bg-gray-200"
                  onClick={() => downloadImage(lightboxResult.image)}
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
