import { useStore } from '../hooks/use-store';
import { Button } from '@/components/ui/button';
import { User, Settings, CreditCard, Package, LogOut, ShieldAlert } from 'lucide-react';

export default function Profile() {
  const { state, resetState } = useStore();

  const handleReset = () => {
    if (confirm("Are you sure? This will delete your bag, wishlist, and all saved data.")) {
      resetState();
      window.location.href = "/";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="font-heading font-black text-3xl uppercase tracking-tight text-[#282C3F]">My Account</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white border rounded-sm overflow-hidden">
            <div className="p-6 border-b flex items-center gap-4 bg-gray-100">
              <div className="w-16 h-16 rounded-full bg-white border flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h2 className="font-bold text-[#282C3F]">StyleVerse User</h2>
                <p className="text-xs text-gray-500">user@example.com</p>
              </div>
            </div>
            
            <nav className="flex flex-col py-2">
              <button className="flex items-center gap-3 px-6 py-4 text-sm font-bold text-[#FF3F6C] bg-pink-50 border-l-4 border-[#FF3F6C]">
                <Package className="h-4 w-4" /> Orders
              </button>
              <button className="flex items-center gap-3 px-6 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 border-l-4 border-transparent">
                <Settings className="h-4 w-4" /> Preferences
              </button>
              <button className="flex items-center gap-3 px-6 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 border-l-4 border-transparent">
                <CreditCard className="h-4 w-4" /> Saved Cards
              </button>
              <button className="flex items-center gap-3 px-6 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 border-l-4 border-transparent border-t mt-2">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          <div className="bg-white border rounded-sm p-6">
            <h3 className="font-bold uppercase tracking-wider text-sm text-gray-500 mb-6">Style Preferences (Local State)</h3>
            
            <div className="grid grid-cols-2 gap-y-4 text-sm mb-8">
              <div>
                <span className="block text-gray-500 text-xs mb-1">Current Mood</span>
                <span className="font-bold capitalize">{state.prefs.mood}</span>
              </div>
              <div>
                <span className="block text-gray-500 text-xs mb-1">Current Weather</span>
                <span className="font-bold capitalize">{state.prefs.weather}</span>
              </div>
              <div>
                <span className="block text-gray-500 text-xs mb-1">Skin Tone Profile</span>
                <span className="font-bold capitalize">{state.prefs.skinTone}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">Modify these in the Style Companion page.</p>
          </div>

          <div className="bg-white border rounded-sm p-6">
            <h3 className="font-bold uppercase tracking-wider text-sm text-gray-500 mb-6">Data Management</h3>
            
            <div className="flex items-center justify-between p-4 bg-red-50 rounded border border-red-100">
              <div>
                <h4 className="font-bold text-red-800 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Reset App Data
                </h4>
                <p className="text-xs text-red-600 mt-1 max-w-sm">This will clear your localStorage and reset the app back to its default state. Your saved looks and bag will be lost.</p>
              </div>
              <Button onClick={handleReset} variant="destructive" size="sm">Reset Data</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
