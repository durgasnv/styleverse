import { useStore } from '../hooks/use-store';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Check, FolderHeart } from 'lucide-react';
import { useState } from 'react';
import { Input } from './ui/input';

export function SaveToCollectionDialog({ productId, outfitId, children }: { productId?: string, outfitId?: string, children: React.ReactNode }) {
  const { state, toggleCollectionProduct, createCollection } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newColName.trim()) {
      createCollection(newColName.trim());
      setNewColName('');
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to Collection</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
            {state.collections.map(col => {
              const isSaved = productId ? col.productIds.includes(productId) : (outfitId ? col.outfitIds.includes(outfitId) : false);
              return (
                <button
                  key={col.id}
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-gray-50 transition-colors text-left"
                  onClick={() => {
                    if (productId) toggleCollectionProduct(col.id, productId);
                    // For outfits, we'd add toggleCollectionOutfit but leaving simple for now
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                      <FolderHeart className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#282C3F]">{col.name}</div>
                      <div className="text-xs text-gray-500">{col.productIds.length + col.outfitIds.length} items</div>
                    </div>
                  </div>
                  {isSaved && <Check className="h-5 w-5 text-[#FF3F6C]" />}
                </button>
              );
            })}
          </div>

          {isCreating ? (
            <form onSubmit={handleCreate} className="flex items-center gap-2 mt-2">
              <Input 
                autoFocus
                placeholder="Collection name" 
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                className="text-sm"
              />
              <Button type="submit" size="sm" className="bg-[#FF3F6C] hover:bg-[#d93059] text-white">Add</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
            </form>
          ) : (
            <Button 
              variant="outline" 
              className="w-full mt-2 border-dashed border-2 py-6 text-gray-500 hover:text-[#FF3F6C] hover:border-[#FF3F6C]"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create New Collection
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
