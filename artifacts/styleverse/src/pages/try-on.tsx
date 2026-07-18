import { useState, useRef, useEffect } from 'react';
import { useSearch } from 'wouter';
import type { Product } from '../data/mock-data';
import { useProducts } from '../hooks/use-catalog';
import { useTryOn } from '../hooks/use-tryon';
import { PRESET_MODELS } from '../data/preset-models';
import { classifyGarmentSlot, type GarmentSlot } from '../lib/pose-fit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Upload, RotateCcw } from 'lucide-react';

const SLOT_Z_INDEX: Record<GarmentSlot, number> = {
  footwear: 1,
  bottom: 2,
  dress: 2,
  top: 3,
  outerwear: 4,
  accessory: 5,
};

export default function TryOn() {
  const search = useSearch();
  const { products: allProducts } = useProducts();
  const {
    baseImage,
    garments,
    imgRef,
    selectPresetModel,
    selectUploadedPhoto,
    addGarment,
    removeGarment,
    updateGarmentBox,
    reset,
  } = useTryOn();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Garment boxes are computed as percentages of the base image's natural
  // dimensions. Sizing the stage to that same aspect ratio (instead of a
  // fixed 3:4 box) means the image renders uncropped and those percentages
  // land exactly where they were computed, regardless of the source photo's
  // actual proportions.
  useEffect(() => {
    setImgAspect(null);
  }, [baseImage?.src]);

  const handleBaseImageLoad = () => {
    const img = imgRef.current;
    if (img && img.naturalWidth && img.naturalHeight) {
      setImgAspect(img.naturalWidth / img.naturalHeight);
    }
  };

  // "Try It On" links elsewhere in the app can pass ?add=<productId> —
  // apply it once a base image is chosen and products have loaded.
  const appliedAddParam = useRef<string | null>(null);
  useEffect(() => {
    const addId = new URLSearchParams(search).get('add');
    if (!addId || addId === appliedAddParam.current || !baseImage || allProducts.length === 0) return;
    const product = allProducts.find((p) => p.id === addId);
    if (!product) return;
    appliedAddParam.current = addId;
    addGarment(product);
  }, [search, baseImage, allProducts, addGarment]);

  const categories = ['All', ...Array.from(new Set(allProducts.map((p) => p.category)))];
  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') selectUploadedPhoto(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddGarment = async (product: Product) => {
    setAddingId(product.id);
    try {
      await addGarment(product);
    } finally {
      setAddingId(null);
    }
  };

  // Manual nudge for a placed garment — same drag-and-drop technique as Style Canvas,
  // but positions are stored as container-relative percentages, not pixels.
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleStageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!stageRef.current || !draggingId) return;
    const garment = garments.find((g) => g.id === draggingId);
    if (!garment) return;

    const rect = stageRef.current.getBoundingClientRect();
    const leftPct = ((e.clientX - rect.left) / rect.width) * 100 - garment.box.widthPct / 2;
    const topPct = ((e.clientY - rect.top) / rect.height) * 100 - garment.box.heightPct / 2;

    updateGarmentBox(draggingId, {
      ...garment.box,
      leftPct: Math.max(0, Math.min(leftPct, 100 - garment.box.widthPct)),
      topPct: Math.max(0, Math.min(topPct, 100 - garment.box.heightPct)),
    });
    setDraggingId(null);
  };

  if (!baseImage) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-heading font-black text-2xl text-[#282C3F] mb-2">Try It On</h1>
        <p className="text-gray-500 mb-8">Pick a model to preview outfits on, or upload your own photo.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
          {PRESET_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => selectPresetModel(model.id, model.image)}
              className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-[#FF3F6C] transition-colors bg-gray-100"
            >
              <img src={model.image} alt={model.alt} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        <div className="border-t pt-6">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" onClick={handleUploadClick}>
            <Upload className="w-4 h-4 mr-2" /> Upload your own photo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <h1 className="font-heading font-black text-xl text-[#282C3F]">Try It On</h1>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="w-4 h-4 mr-2" /> Change Model
        </Button>
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
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar hide-scrollbar">
              {categories.map((cat) => (
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
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddGarment(product)}
                disabled={addingId === product.id}
                className="bg-white rounded border border-transparent hover:border-[#FF3F6C] p-1 group aspect-[3/4] flex flex-col text-left disabled:opacity-50"
              >
                <div className="flex-1 bg-gray-100 rounded-sm overflow-hidden pointer-events-none">
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" draggable={false} />
                </div>
                <div className="p-1 mt-1 shrink-0 pointer-events-none">
                  <div className="text-[10px] font-bold truncate text-[#282C3F]">{product.brand}</div>
                  <div className="text-[10px] font-mono text-gray-500">
                    {addingId === product.id ? 'Fitting…' : `₹${product.price}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Stage */}
        <div
          className="flex-1 bg-[#FAFAFA] relative overflow-hidden flex items-center justify-center"
          ref={stageRef}
          onDragOver={handleStageDragOver}
          onDrop={handleStageDrop}
        >
          <div
            className="relative h-full max-h-full bg-white shadow-sm"
            style={{ aspectRatio: imgAspect ?? 3 / 4 }}
          >
            <img
              ref={imgRef}
              src={baseImage.src}
              alt=""
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
              onLoad={handleBaseImageLoad}
            />

            {garments.map((garment) => (
              <div
                key={garment.id}
                draggable
                onDragStart={(e) => handleDragStart(e, garment.id)}
                className="absolute cursor-move group"
                style={{
                  left: `${garment.box.leftPct}%`,
                  top: `${garment.box.topPct}%`,
                  width: `${garment.box.widthPct}%`,
                  height: `${garment.box.heightPct}%`,
                  zIndex: SLOT_Z_INDEX[classifyGarmentSlot(garment.product)],
                }}
              >
                <img
                  src={garment.product.images[0]}
                  alt=""
                  className="w-full h-full object-contain pointer-events-none drop-shadow-md"
                  draggable={false}
                />
                <button
                  onClick={() => removeGarment(garment.id)}
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity z-10"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
