import { Link, useLocation } from 'wouter';
import { Search, Heart, ShoppingBag, User, Menu, X, ChevronDown } from 'lucide-react';
import { useStore } from '../hooks/use-store';
import { useState } from 'react';

export function Navbar() {
  const { state } = useStore();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = ['Men', 'Women', 'Kids', 'Home & Living', 'Beauty'];

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button 
          className="lg:hidden p-2 -ml-2 text-gray-600"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-2 lg:mr-6 flex-shrink-0">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <defs>
              <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF3F6C" />
                <stop offset="50%" stopColor="#FF7E5F" />
                <stop offset="100%" stopColor="#FEB47B" />
              </linearGradient>
            </defs>
            <path d="M6 26L20 4L28 8L14 30Z" fill="url(#logo-gradient)"/>
            <path d="M4 12L12 4L26 22L18 30Z" fill="#FF3F6C" opacity="0.8" style={{mixBlendMode: "multiply"}}/>
          </svg>
          <span className="font-heading font-black text-xl tracking-tight hidden sm:block text-[#282C3F]">StyleVerse</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center h-full mr-auto">
          {categories.map((cat) => (
            <Link 
              key={cat} 
              href={`/search?c=${encodeURIComponent(cat)}`}
              className="px-3 xl:px-4 h-full flex items-center text-sm font-bold text-[#282C3F] hover:border-b-4 hover:border-[#FF3F6C] border-b-4 border-transparent uppercase transition-colors"
            >
              {cat}
            </Link>
          ))}
          
          {/* GENZ Dropdown */}
          <div className="group relative h-full flex items-center">
            <button className="px-3 xl:px-4 h-full flex items-center gap-1 text-sm font-bold text-[#282C3F] group-hover:border-b-4 group-hover:border-[#FF3F6C] border-b-4 border-transparent uppercase transition-colors outline-none cursor-pointer">
              GENZ <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
            </button>
            
            <div className="absolute top-full left-0 w-56 bg-white border shadow-xl rounded-b-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform translate-y-2 group-hover:translate-y-0 z-50">
              <div className="p-2 space-y-1">
                <Link href="/hubs" className="block px-4 py-3 hover:bg-gray-50 rounded-md transition-colors text-sm font-bold text-[#282C3F]">
                  Style Hubs
                </Link>
                <Link href="/canvas" className="block px-4 py-3 hover:bg-gray-50 rounded-md transition-colors text-sm font-bold text-[#282C3F]">
                  Style Canvas
                </Link>
                <Link href="/companion" className="block px-4 py-3 hover:bg-gray-50 rounded-md transition-colors text-sm font-bold text-[#282C3F]">
                  AI Style Companion
                </Link>
                <Link href="/challenges" className="block px-4 py-3 hover:bg-gray-50 rounded-md transition-colors text-sm font-bold text-[#282C3F]">
                  Fashion Challenges
                </Link>
                <Link href="/collections" className="block px-4 py-3 hover:bg-gray-50 rounded-md transition-colors text-sm font-bold text-[#282C3F]">
                  Saved Collections
                </Link>
                <Link href="/my-looks" className="block px-4 py-3 hover:bg-gray-50 rounded-md transition-colors text-sm font-bold text-[#282C3F]">
                  My Looks
                </Link>
              </div>
            </div>
          </div>

          <Link
            href="/canvas"
            className="px-3 xl:px-4 h-full flex items-center gap-1 text-sm font-bold text-[#282C3F] hover:border-b-4 hover:border-[#FF3F6C] border-b-4 border-transparent uppercase transition-colors relative"
          >
            STYLE CANVAS
            {!location.startsWith('/canvas') && (
              <span className="absolute top-2.5 -right-1 bg-[#FF3F6C] text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm leading-none">NEW</span>
            )}
          </Link>
        </nav>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-sm hidden md:flex items-center bg-[#F5F5F6] rounded-md px-4 py-2 transition-colors focus-within:bg-white focus-within:shadow-sm focus-within:border focus-within:border-gray-200">
          <Search className="h-4 w-4 text-gray-500 mr-3 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Search for products, brands and more" 
            className="bg-transparent border-none outline-none w-full text-sm text-[#282C3F] placeholder-gray-500 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Icons */}
        <div className="flex items-center gap-4 sm:gap-6 text-[#282C3F] ml-2">
          <Link href="/profile" className="flex flex-col items-center justify-center gap-1 hover:text-[#FF3F6C] transition-colors hidden sm:flex">
            <User className="h-5 w-5" />
            <span className="text-[11px] font-bold">Profile</span>
          </Link>
          
          <Link href="/my-looks" className="flex flex-col items-center justify-center gap-1 hover:text-[#FF3F6C] transition-colors relative">
            <Heart className="h-5 w-5" />
            <span className="text-[11px] font-bold hidden sm:block">Wishlist</span>
            {state.wishlist.length > 0 && (
              <span className="absolute -top-1.5 right-1 sm:-right-1.5 bg-[#FF3F6C] text-white text-[10px] font-bold font-mono h-4 w-4 rounded-full flex items-center justify-center">
                {state.wishlist.length}
              </span>
            )}
          </Link>
          
          <Link href="/bag" className="flex flex-col items-center justify-center gap-1 hover:text-[#FF3F6C] transition-colors relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-[11px] font-bold hidden sm:block">Bag</span>
            {state.bag.length > 0 && (
              <span className="absolute -top-1.5 right-0 sm:-right-1.5 bg-[#FF3F6C] text-white text-[10px] font-bold font-mono h-4 w-4 rounded-full flex items-center justify-center">
                {state.bag.reduce((acc, item) => acc + item.qty, 0)}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Search - Visible only on mobile below the header */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="flex items-center bg-[#F5F5F6] rounded-md px-3 py-2.5">
          <Search className="h-4 w-4 text-gray-500 mr-2" />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="bg-transparent border-none outline-none w-full text-sm text-[#282C3F] font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute top-0 left-0 bottom-0 w-4/5 max-w-sm bg-white shadow-xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <div className="font-bold text-sm">StyleVerse User</div>
                  <Link href="/profile" className="text-xs text-[#FF3F6C]" onClick={() => setMobileMenuOpen(false)}>View Profile</Link>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-4 py-3 font-bold text-xs text-gray-400 uppercase tracking-wider">Shop By Category</div>
              {categories.map((cat) => (
                <Link 
                  key={cat} 
                  href={`/search?c=${encodeURIComponent(cat)}`}
                  className="block px-4 py-3 text-sm font-bold text-[#282C3F] hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {cat}
                </Link>
              ))}
              
              <div className="border-t my-2"></div>
              
              <div className="px-4 py-3 font-bold text-xs text-gray-400 uppercase tracking-wider">GENZ</div>
              <Link href="/hubs" className="block px-4 py-3 text-sm font-bold text-[#282C3F] hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                Style Hubs
              </Link>
              <Link href="/canvas" className="block px-4 py-3 text-sm font-bold text-[#282C3F] hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                Style Canvas
              </Link>
              <Link href="/companion" className="block px-4 py-3 text-sm font-bold text-[#282C3F] hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                AI Style Companion
              </Link>
              <Link href="/challenges" className="block px-4 py-3 text-sm font-bold text-[#282C3F] hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                Fashion Challenges
              </Link>
              <Link href="/collections" className="block px-4 py-3 text-sm font-bold text-[#282C3F] hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                Saved Collections
              </Link>
              <Link href="/my-looks" className="block px-4 py-3 text-sm font-bold text-[#282C3F] hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                My Looks
              </Link>

              <div className="border-t my-2"></div>

              <Link href="/canvas" className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-[#FF3F6C] hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                STYLE CANVAS {!location.startsWith('/canvas') && <span className="bg-[#FF3F6C] text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm leading-none">NEW</span>}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
