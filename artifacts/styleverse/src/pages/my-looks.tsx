import { useStore } from '../hooks/use-store';
import { useProducts } from '../hooks/use-catalog';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Wand2, Trash2, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function MyLooks() {
  const { state, removeLook } = useStore();
  const { products: allProducts } = useProducts();
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-black text-3xl uppercase tracking-tight text-[#282C3F]">My Looks</h1>
          <p className="text-gray-500 mt-1">Outfits you've designed in the Style Canvas.</p>
        </div>
        <Button onClick={() => setLocation('/canvas')} className="bg-[#282C3F] text-white font-bold w-full md:w-auto">
          <SlidersHorizontal className="w-4 h-4 mr-2" /> New Design
        </Button>
      </div>

      {state.myLooks.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
          <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-xl text-[#282C3F] mb-2">No looks designed yet</h2>
          <p className="text-gray-500 mb-6">Head over to the canvas to start mixing and matching items.</p>
          <Button onClick={() => setLocation('/canvas')} className="bg-[#FF3F6C] hover:bg-[#d93059] text-white">Go to Canvas</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {state.myLooks.map(look => {
            const products = look.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts;
            
            return (
              <div key={look.id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <div className="aspect-square bg-gray-100 p-4 relative flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                  <div className="relative w-full h-full max-w-[200px] mx-auto flex items-center justify-center">
                    {products.slice(0, 3).map((p, i) => (
                      <div 
                        key={i} 
                        className="absolute bg-white p-1 shadow-md border border-gray-200 transition-transform group-hover:scale-105"
                        style={{
                          width: '45%',
                          aspectRatio: '3/4',
                          zIndex: 10 + i,
                          transform: `rotate(${i === 0 ? -10 : i === 1 ? 5 : 15}deg) translate(${i === 0 ? '-30%' : i === 1 ? '0%' : '30%'}, ${i === 0 ? '-10%' : i === 1 ? '10%' : '-5%'})`
                        }}
                      >
                        <img src={p.images[0]} className="w-full h-full object-cover" alt="" />
                      </div>
                    ))}
                    {products.length > 3 && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded z-50">
                        +{products.length - 3} items
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-[#282C3F] truncate flex-1">{look.name}</h3>
                    <button onClick={() => removeLook(look.id)} className="text-gray-400 hover:text-red-500 ml-2">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-4">{format(new Date(look.createdAt), 'MMM d, yyyy')}</p>
                  
                  <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold" onClick={() => setLocation(`/companion?lookId=${look.id}`)}>
                      <Wand2 className="w-3 h-3 mr-1 text-indigo-500" /> AI Score
                    </Button>
                    <Button size="sm" className="w-full text-xs font-bold bg-[#FF3F6C] hover:bg-[#d93059] text-white">
                      Submit <span className="hidden sm:inline ml-1">to Challenge</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
