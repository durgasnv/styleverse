import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { Navbar } from './components/Navbar';
import { IdentityGate } from './components/IdentityGate';
import Home from './pages/home';
import Search from './pages/search';
import ProductDetail from './pages/product';
import Bag from './pages/bag';
import Checkout from './pages/checkout';
import Hubs from './pages/hubs';
import HubDetail from './pages/hub-detail';
import Canvas from './pages/canvas';
import Companion from './pages/companion';
import Challenges from './pages/challenges';
import Collections from './pages/collections';
import MyLooks from './pages/my-looks';
import Profile from './pages/profile';
import VoteRoom from './pages/vote-room';

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground">
      <Navbar />
      <main className="flex-1 w-full">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/search" component={Search} />
          <Route path="/product/:id" component={ProductDetail} />
          <Route path="/bag" component={Bag} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/hubs" component={Hubs} />
          <Route path="/hubs/:id" component={HubDetail} />
          <Route path="/canvas" component={Canvas} />
          <Route path="/companion" component={Companion} />
          <Route path="/challenges" component={Challenges} />
          <Route path="/collections" component={Collections} />
          <Route path="/my-looks" component={MyLooks} />
          <Route path="/profile" component={Profile} />
          <Route path="/vote/:roomId" component={VoteRoom} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      {/* Simple Footer */}
      <footer className="bg-[#FAFAFA] border-t py-8 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <span className="font-heading font-bold text-xl tracking-tight">StyleVerse</span>
            <p className="text-xs text-gray-500 mt-1">A Myntra-inspired fashion ecosystem.</p>
          </div>
          <div className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} StyleVerse Demo App. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <IdentityGate />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
