import { useStore } from '../hooks/use-store';
import { useProducts } from '../hooks/use-catalog';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { CheckCircle2, CreditCard, Wallet, Banknote } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export default function Checkout() {
  const { state, clearBag } = useStore();
  const { products, isLoading } = useProducts();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');

  const bagItems = state.bag.map(item => {
    const product = products.find(p => p.id === item.productId);
    return { ...item, product };
  }).filter(item => item.product !== undefined) as (typeof state.bag[0] & { product: typeof products[0] })[];

  // Redirect out of an empty-bag checkout as an effect, not as a render side effect.
  useEffect(() => {
    if (!isLoading && !orderComplete && bagItems.length === 0) {
      setLocation('/bag');
    }
  }, [isLoading, orderComplete, bagItems.length, setLocation]);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="size-8" /></div>;
  }

  if (orderComplete) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 bg-gray-50">
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="font-heading font-bold text-2xl text-[#282C3F] mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-2">Your order has been placed successfully.</p>
        <p className="text-sm font-mono text-gray-500 mb-8 bg-gray-200 px-4 py-2 rounded">Order ID: {orderId}</p>
        <div className="flex gap-4">
          <Button onClick={() => setLocation('/')} variant="outline" className="font-bold border-gray-300">Home</Button>
          <Button onClick={() => setLocation('/my-looks')} className="bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold">View My Looks</Button>
        </div>
      </div>
    );
  }

  if (bagItems.length === 0) {
    return null;
  }

  const totalMRP = bagItems.reduce((acc, item) => acc + (item.product.mrp * item.qty), 0);
  const totalDiscount = bagItems.reduce((acc, item) => acc + ((item.product.mrp - item.product.price) * item.qty), 0);
  const finalTotal = totalMRP - totalDiscount;

  const handlePlaceOrder = () => {
    const newOrderId = `ORD${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    setOrderId(newOrderId);
    clearBag();
    setOrderComplete(true);
    window.scrollTo(0, 0);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Form Area */}
        <div className="flex-1">
          {/* Step 1: Address */}
          <div className={`border rounded-sm overflow-hidden mb-6 ${step === 1 ? 'border-gray-300 shadow-sm' : 'border-gray-200 bg-gray-50'}`}>
            <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
              <h2 className="font-bold text-sm text-[#282C3F] flex items-center gap-2">
                <span className="bg-[#282C3F] text-white w-5 h-5 rounded-sm flex items-center justify-center text-xs">1</span>
                DELIVERY ADDRESS
              </h2>
              {step === 2 && (
                <button onClick={() => setStep(1)} className="text-[#FF3F6C] text-xs font-bold uppercase hover:underline">Change</button>
              )}
            </div>
            
            {step === 1 ? (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input defaultValue="Rahul" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input defaultValue="Sharma" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input defaultValue="123, Tech Park, Block C" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input defaultValue="Bangalore" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode *</Label>
                    <Input defaultValue="560001" />
                  </div>
                </div>
                <div className="pt-4">
                  <Button onClick={() => setStep(2)} className="bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold w-full uppercase tracking-wide">Deliver Here</Button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-600">
                <p className="font-bold text-[#282C3F]">Rahul Sharma</p>
                <p>123, Tech Park, Block C, Bangalore - 560001</p>
              </div>
            )}
          </div>

          {/* Step 2: Payment */}
          <div className={`border rounded-sm overflow-hidden ${step === 2 ? 'border-gray-300 shadow-sm' : 'border-gray-200 bg-gray-50'}`}>
            <div className="bg-gray-100 px-4 py-3 border-b">
              <h2 className="font-bold text-sm text-[#282C3F] flex items-center gap-2">
                <span className="bg-[#282C3F] text-white w-5 h-5 rounded-sm flex items-center justify-center text-xs">2</span>
                PAYMENT METHOD
              </h2>
            </div>
            
            {step === 2 && (
              <div className="flex border-b">
                <div className="w-1/3 bg-gray-50 border-r py-2">
                  <button onClick={() => setPaymentMethod('upi')} className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-2 ${paymentMethod === 'upi' ? 'text-[#FF3F6C] bg-white border-l-4 border-l-[#FF3F6C]' : 'text-gray-600 border-l-4 border-transparent'}`}>
                    <Wallet className="w-4 h-4"/> UPI
                  </button>
                  <button onClick={() => setPaymentMethod('card')} className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-2 ${paymentMethod === 'card' ? 'text-[#FF3F6C] bg-white border-l-4 border-l-[#FF3F6C]' : 'text-gray-600 border-l-4 border-transparent'}`}>
                    <CreditCard className="w-4 h-4"/> Credit/Debit
                  </button>
                  <button onClick={() => setPaymentMethod('cod')} className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-2 ${paymentMethod === 'cod' ? 'text-[#FF3F6C] bg-white border-l-4 border-l-[#FF3F6C]' : 'text-gray-600 border-l-4 border-transparent'}`}>
                    <Banknote className="w-4 h-4"/> Cash on Delivery
                  </button>
                </div>
                <div className="w-2/3 p-6 bg-white">
                  {paymentMethod === 'upi' && (
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-gray-700 mb-2">Enter your UPI ID</p>
                      <Input placeholder="username@upi" />
                      <Button onClick={handlePlaceOrder} className="w-full bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold py-6 text-sm uppercase tracking-wide">
                        Pay ₹{finalTotal}
                      </Button>
                    </div>
                  )}
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      <Input placeholder="Card Number" />
                      <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="MM/YY" />
                        <Input placeholder="CVV" type="password" />
                      </div>
                      <Button onClick={handlePlaceOrder} className="w-full bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold py-6 text-sm uppercase tracking-wide">
                        Pay ₹{finalTotal}
                      </Button>
                    </div>
                  )}
                  {paymentMethod === 'cod' && (
                    <div className="space-y-4">
                      <div className="bg-orange-50 text-orange-800 p-3 rounded text-sm mb-4">
                        Please keep ₹{finalTotal} ready in cash or UPI when the delivery executive arrives.
                      </div>
                      <Button onClick={handlePlaceOrder} className="w-full bg-[#FF3F6C] hover:bg-[#d93059] text-white font-bold py-6 text-sm uppercase tracking-wide">
                        Place Order (COD)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Summary Area */}
        <div className="w-full md:w-[35%]">
          <div className="border rounded-sm bg-white p-4">
            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wide mb-4">Order Summary</h3>
            
            <div className="space-y-3 text-sm mb-4 max-h-[30vh] overflow-y-auto pr-2">
              {bagItems.map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-12 h-16 bg-gray-100 shrink-0">
                    <img src={item.product.images[0]} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-xs text-[#282C3F] truncate">{item.product.brand}</div>
                    <div className="text-xs text-gray-500 truncate">{item.product.name}</div>
                    <div className="text-xs text-gray-500 mt-1">Qty: {item.qty} | Size: {item.size}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t my-4"></div>

            <div className="space-y-2 text-sm text-[#282C3F] font-mono">
              <div className="flex justify-between">
                <span>Total Amount</span>
                <span className="font-bold">₹{finalTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
