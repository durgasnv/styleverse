import { useState, useRef, useEffect } from 'react';
import type { Product } from '../data/mock-data';
import { useProducts } from '../hooks/use-catalog';
import { useStore } from '../hooks/use-store';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle, Wand2, Search, SlidersHorizontal, ShoppingBag, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createVotingRoom } from '../lib/voting-api';
import { useVoterId } from '../hooks/use-voter-id';

interface CanvasItem {
  id: string; // unique ID for this instance on canvas
  product: Product;
  x: number;
  y: number;
  z: number;
}

export default function Canvas() {
  const { saveLook, addToBag } = useStore();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { products: allProducts } = useProducts();
  const voterId = useVoterId();

  const [items, setItems] = useState<CanvasItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedItem, setDraggedItem] = useState<{id: string, isFromCatalog: boolean} | null>(null);
  const [highestZ, setHighestZ] = useState(1);
  const [isSharing, setIsSharing] = useState(false);

  // "Open in Canvas" from the product page links here with ?add=<productId> —
  // pick it up once products have loaded and drop it onto the canvas.
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

  const handleSaveLook = () => {
    if (items.length === 0) {
      toast({ title: "Canvas is empty", description: "Add some items before saving.", variant: "destructive" });
      return;
    }
    
    const uniqueProductIds = Array.from(new Set(items.map(i => i.product.id)));
    const lookName = `Look ${new Date().toLocaleDateString()}`;
    
    saveLook({
      name: lookName,
      productIds: uniqueProductIds
    });
    
    toast({
      title: "Look Saved!",
      description: "You can find this in My Looks.",
      action: <Button variant="outline" size="sm" onClick={() => setLocation('/my-looks')}>View</Button>
    });
  };

  const checkWithCompanion = () => {
    if (items.length === 0) {
      toast({ title: "Canvas is empty", description: "Add some items to get advice.", variant: "destructive" });
      return;
    }
    // Pass the draft directly via the URL instead of persisting it to My Looks —
    // checking with the companion shouldn't silently create a saved look.
    const uniqueProductIds = Array.from(new Set(items.map(i => i.product.id)));
    setLocation(`/companion?items=${uniqueProductIds.join(',')}`);
  };

  const shareForVoting = async () => {
    if (items.length === 0) {
      toast({ title: "Canvas is empty", description: "Add some items before sharing for votes.", variant: "destructive" });
      return;
    }
    const uniqueProductIds = Array.from(new Set(items.map(i => i.product.id)));
    setIsSharing(true);
    try {
      const room = await createVotingRoom({ productIds: uniqueProductIds, creatorVoterId: voterId });
      setLocation(`/vote/${room.id}`);
    } catch (err) {
      toast({ title: "Could not create voting room", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  const addAllToBag = () => {
    if (items.length === 0) return;
    
    const uniqueProducts = Array.from(new Set(items.map(i => i.product)));
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Top Toolbar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <h1 className="font-heading font-black text-xl flex items-center gap-2 text-[#282C3F]">
          Style Canvas
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setItems([])} disabled={items.length === 0} className="hidden sm:flex">
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={addAllToBag} disabled={items.length === 0} className="border-gray-300 hidden md:flex">
            <ShoppingBag className="w-4 h-4 mr-2" /> Shop All
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveLook} disabled={items.length === 0} className="border-[#FF3F6C] text-[#FF3F6C] hover:bg-pink-50">
            <CheckCircle className="w-4 h-4 mr-2" /> Save Look
          </Button>
          <Button variant="outline" size="sm" onClick={shareForVoting} disabled={items.length === 0 || isSharing} className="border-indigo-200 text-indigo-600 hidden sm:flex">
            <Share2 className="w-4 h-4 mr-2" /> {isSharing ? 'Sharing...' : 'Share for Voting'}
          </Button>
          <Button size="sm" onClick={checkWithCompanion} disabled={items.length === 0} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none">
            <Wand2 className="w-4 h-4 mr-2" /> Ask Companion
          </Button>
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
                draggable
                onDragStart={(e) => handleDragStartCatalog(e, product)}
                className="bg-white rounded border border-transparent hover:border-[#FF3F6C] p-1 cursor-grab active:cursor-grabbing group aspect-[3/4] flex flex-col"
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

        {/* Right Canvas Area */}
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
      </div>
    </div>
  );
}
