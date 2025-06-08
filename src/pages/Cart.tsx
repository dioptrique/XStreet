import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRefreshData } from '@/hooks/useRefreshData';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { Trash2, MinusCircle, PlusCircle, Bitcoin } from 'lucide-react';
import { createTransaction } from '@/services/bitcoinService';
import { supabase } from '@/integrations/supabase/client';

const Cart = () => {
  const { items, updateQuantity, removeItem, clearCart, totalSats } = useCart();
  const { isAuthenticated, user, refreshWalletBalance } = useAuth();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  
  // Set up automatic refresh
  const { formattedTimeUntilRefresh } = useRefreshData({});

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to complete your purchase');
      navigate('/login');
      return;
    }
    
    if (user && user.walletBalance < totalSats) {
      toast.error('Your wallet balance is too low for this purchase');
      return;
    }
    
    if (!items.length) {
      toast.error('Your cart is empty');
      return;
    }
    
    setIsCheckingOut(true);
    
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No session token available');
      }

      // Process each item
      for (const item of items) {
        setProcessingStage(`Processing purchase for ${item.name}...`);
        
        try {
          // Call the buy endpoint for each product
          const response = await fetch(`https://anand.ngrok.app/buy/${item.id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          const result = await response.json();
          console.log(`Purchase result for ${item.name}:`, result);
        } catch (error) {
          console.error(`Error purchasing ${item.name}:`, error);
          toast.error(`Failed to purchase ${item.name}`);
          return;
        }
      }
      
      // All purchases successful
      setProcessingStage('Finalizing your order...');
      
      // Refresh the user's wallet balance
      await refreshWalletBalance();
      
      // Clear the cart
      clearCart();
      
      // Show success message
      toast.success(`Purchase complete! Thank you for your order of ${totalSats.toLocaleString()} XRP`);
      
      // Navigate to orders
      navigate('/orders');
    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error('An unexpected error occurred during checkout');
    } finally {
      setIsCheckingOut(false);
      setProcessingStage(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex-grow flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">
            Add some awesome XRP products to get started
          </p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-bitcoin hover:bg-bitcoin-dark"
          >
            Continue Shopping
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <Button 
            variant="outline" 
            onClick={clearCart}
          >
            Clear Cart
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-satstreet-medium rounded-lg border border-satstreet-light overflow-hidden">
              <div className="divide-y divide-satstreet-light">
                {items.map((item) => (
                  <div key={item.id} className="p-4 flex items-center">
                    {/* Product image */}
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-satstreet-dark/30">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    
                    {/* Product details */}
                    <div className="ml-4 flex flex-1 flex-col">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.shopName}</p>
                        </div>
                        <p className="font-mono font-medium">
                          {item.priceInSats.toLocaleString()} XRP
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <MinusCircle size={18} />
                          </button>
                          <span className="mx-2 w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <PlusCircle size={18} />
                          </button>
                        </div>
                        
                        {/* Remove button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Order Summary */}
          <div>
            <div className="bg-satstreet-medium rounded-lg border border-satstreet-light p-6">
              <h2 className="text-lg font-medium mb-4">Order Summary</h2>
              
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} x {item.quantity}</span>
                    <span className="font-mono">
                      {(item.priceInSats * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XRP
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-satstreet-light my-4 pt-4">
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="font-mono text-bitcoin">
                    {totalSats.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XRP
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground mt-1">
                  Prices update in: {formattedTimeUntilRefresh}
                </div>
              </div>
              
              {isAuthenticated && (
                <div className="mt-2 p-3 rounded bg-satstreet-light text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Your wallet balance:</span>
                    <span className="font-mono">
                      {user?.walletBalance.toLocaleString() || 0} XRP
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Balance after purchase:</span>
                    <span className={`font-mono ${(user?.walletBalance || 0) < totalSats ? 'text-red-500' : 'text-green-500'}`}>
                      {((user?.walletBalance || 0) - totalSats).toLocaleString()} XRP
                    </span>
                  </div>
                </div>
              )}
              
              <Button
                className="w-full mt-6 bg-bitcoin hover:bg-bitcoin-dark flex items-center justify-center gap-2"
                disabled={isCheckingOut || (isAuthenticated && (user?.walletBalance || 0) < totalSats)}
                onClick={handleCheckout}
              >
                {isCheckingOut ? (
                  <>
                    <span className="animate-pulse">Processing...</span>
                  </>
                ) : (
                  <>
                    <Bitcoin size={18} />
                    <span>Complete Purchase</span>
                  </>
                )}
              </Button>
              
              {processingStage && (
                <div className="text-xs text-center mt-2 text-bitcoin animate-pulse">
                  {processingStage}
                </div>
              )}
              
              {!isAuthenticated && (
                <p className="text-xs text-center mt-4 text-muted-foreground">
                  You'll need to login to complete your purchase
                </p>
              )}
              
              {isAuthenticated && (user?.walletBalance || 0) < totalSats && (
                <p className="text-xs text-center mt-4 text-red-500">
                  Insufficient wallet balance
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Cart;
