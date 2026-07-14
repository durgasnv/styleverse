import { useStore } from '../hooks/use-store';
import { useProducts } from '../hooks/use-catalog';
import { Link } from 'wouter';
import { FolderHeart, MoreVertical, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function Collections() {
  const { state, createCollection, deleteCollection } = useStore();
  const { products } = useProducts();
  const [newColName, setNewColName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newColName.trim()) {
      createCollection(newColName.trim());
      setNewColName('');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-heading font-black text-3xl uppercase tracking-tight text-[#282C3F]">Saved Collections</h1>
          <p className="text-gray-500 mt-1">Organize your favorite products and outfits.</p>
        </div>
        
        <form onSubmit={handleCreate} className="flex gap-2 w-full md:w-auto">
          <Input 
            placeholder="New collection name" 
            value={newColName}
            onChange={e => setNewColName(e.target.value)}
            className="w-full md:w-48"
          />
          <Button type="submit" className="bg-[#282C3F] text-white whitespace-nowrap">Create</Button>
        </form>
      </div>

      {state.collections.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
          <FolderHeart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="font-bold text-xl text-[#282C3F] mb-2">No collections yet</h2>
          <p className="text-gray-500">Create one above to start saving items.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {state.collections.map(col => {
            const firstProduct = col.productIds.length > 0 
              ? products.find(p => p.id === col.productIds[0])
              : null;
              
            return (
              <div key={col.id} className="group relative">
                <Link href={`#`} className="block bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 relative p-1">
                    {firstProduct ? (
                      <div className="w-full h-full rounded overflow-hidden">
                        <img src={firstProduct.images[0]} className="w-full h-full object-cover" alt="" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 rounded">
                        <FolderHeart className="h-12 w-12" />
                      </div>
                    )}
                    {col.productIds.length > 1 && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white/90 backdrop-blur px-3 py-1 rounded text-xs font-bold">
                          +{col.productIds.length - 1} more
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[#282C3F] truncate pr-6">{col.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-1">{col.productIds.length + col.outfitIds.length} items</p>
                  </div>
                </Link>
                
                <div className="absolute bottom-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-800">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700" onClick={() => deleteCollection(col.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Collection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
