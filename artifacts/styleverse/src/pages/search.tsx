import { useState, useMemo, useEffect } from 'react';
import { useSearch } from 'wouter';
import type { Category } from '../data/mock-data';
import { useProducts } from '../hooks/use-catalog';
import { ProductCard } from '../components/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, SlidersHorizontal, ChevronDown, Search as SearchIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Spinner } from '@/components/ui/spinner';

export default function Search() {
  const searchString = useSearch();
  const { products: allProducts, isLoading } = useProducts();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const urlQuery = searchParams.get('q') || '';
  const urlCategory = searchParams.get('c') || '';

  const [query, setQuery] = useState(urlQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(urlCategory ? [urlCategory] : []);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sort, setSort] = useState('recommended');

  // Re-sync filters when navigating to /search with new query params (e.g. from the Navbar)
  // without a full remount, since wouter keeps this component mounted across query-only changes.
  useEffect(() => {
    setQuery(urlQuery);
    setSelectedCategories(urlCategory ? [urlCategory] : []);
  }, [searchString]);

  const categories = Array.from(new Set(allProducts.map(p => p.category)));
  const brands = Array.from(new Set(allProducts.map(p => p.brand)));

  const filteredProducts = useMemo(() => {
    let result = allProducts;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter(p => selectedCategories.includes(p.category));
    }

    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }

    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    switch (sort) {
      case 'new':
        result.sort((a, b) => parseInt(b.id.slice(1)) - parseInt(a.id.slice(1)));
        break;
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'discount':
        result.sort((a, b) => b.discountPercent - a.discountPercent);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      default: // recommended
        result.sort((a, b) => (b.rating * b.reviewCount) - (a.rating * a.reviewCount));
    }

    return result;
  }, [allProducts, query, selectedCategories, selectedBrands, priceRange, sort]);

  const toggleFilter = (setFn: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setFn(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold uppercase tracking-wider text-sm">Filters</h3>
        <button 
          className="text-[#FF3F6C] text-xs font-bold uppercase"
          onClick={() => {
            setSelectedCategories([]);
            setSelectedBrands([]);
            setPriceRange([0, 10000]);
          }}
        >
          Clear All
        </button>
      </div>

      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex w-full items-center justify-between font-bold text-sm py-2">
          Category <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {categories.map(cat => (
            <div key={cat} className="flex items-center space-x-2">
              <Checkbox 
                id={`cat-${cat}`} 
                checked={selectedCategories.includes(cat)}
                onCheckedChange={() => toggleFilter(setSelectedCategories, cat)}
              />
              <Label htmlFor={`cat-${cat}`} className="text-sm font-normal text-gray-700">{cat}</Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="border-t my-4"></div>

      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex w-full items-center justify-between font-bold text-sm py-2">
          Brand <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
          {brands.map(brand => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox 
                id={`brand-${brand}`} 
                checked={selectedBrands.includes(brand)}
                onCheckedChange={() => toggleFilter(setSelectedBrands, brand)}
              />
              <Label htmlFor={`brand-${brand}`} className="text-sm font-normal text-gray-700">{brand}</Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="border-t my-4"></div>

      <div>
        <h4 className="font-bold text-sm mb-4">Price Range</h4>
        <Slider
          defaultValue={[0, 10000]}
          max={10000}
          step={100}
          value={priceRange}
          onValueChange={setPriceRange}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-xs font-mono">
          <span>₹{priceRange[0]}</span>
          <span>₹{priceRange[1]}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Search Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="font-bold text-[#282C3F]">
            {query ? `Search Results for "${query}"` : (selectedCategories.length > 0 ? selectedCategories.join(', ') : 'All Products')}
          </h1>
          <p className="text-sm text-gray-500 font-mono mt-1">- {filteredProducts.length} items -</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <FilterSidebar />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 relative">
            <span className="text-sm text-gray-500 hidden sm:inline-block whitespace-nowrap">Sort by : </span>
            <select 
              className="text-sm border border-gray-300 rounded px-3 py-1.5 bg-white font-bold outline-none focus:border-[#FF3F6C]"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recommended">Recommended</option>
              <option value="new">What's New</option>
              <option value="rating">Customer Rating</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="discount">Better Discount</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto border-r pr-6">
          <FilterSidebar />
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-40 h-40 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <SearchIcon className="h-16 w-16 text-gray-300" />
              </div>
              <h2 className="font-heading font-bold text-2xl mb-2 text-[#282C3F]">We couldn't find any matches!</h2>
              <p className="text-gray-500 max-w-md">Please check the spelling or try searching for something else</p>
              <Button 
                className="mt-6 bg-[#FF3F6C] text-white hover:bg-[#d93059]"
                onClick={() => {
                  setQuery('');
                  setSelectedCategories([]);
                  setSelectedBrands([]);
                  setPriceRange([0, 10000]);
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
