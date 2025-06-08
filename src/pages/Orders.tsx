import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Clock, Package, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface EscrowData {
  amount: number;
  created_time: string;
  finish_after: string;
  destination: string;
  product_name?: string;
  product_description?: string;
  product_price?: number;
  id: string;
}

interface ProductDetails {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  priceInSats: number;
}

const Orders = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [productDetails, setProductDetails] = useState<Record<string, ProductDetails>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [completedOrders, setCompletedOrders] = useState<EscrowData[]>([]);
  const [activeTab, setActiveTab] = useState('in-progress');
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No session token available');
        }

        // First, fetch all escrows
        const response = await fetch('https://anand.ngrok.app/orders_escrows', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch escrows');
        }

        const escrowData: EscrowData[] = await response.json();
        console.log('Fetched escrows:', escrowData);
        
        if (!Array.isArray(escrowData)) {
          throw new Error('Invalid escrow data received');
        }

        setEscrows(escrowData);

        // Then fetch product details for each escrow
        const productDetailsMap: Record<string, ProductDetails> = {};
        for (const escrow of escrowData) {
          if (escrow.id) {
            console.log('Fetching details for product:', escrow.id);
            
            const { data: product, error } = await supabase
              .from('products')
              .select('*')
              .eq('id', escrow.id)
              .single();

            if (product) {
              // Get product image from storage
              const { data: imageData, error: imageError } = await supabase.storage
                .from('product-images-2')
                .list(`${escrow.id}`);

              console.log('Image data:', imageData);
              console.log('Image error:', imageError);

              let imageUrl = '/placeholder.svg';
              if (imageData && imageData.length > 0) {
                const { data: { publicUrl } } = supabase.storage
                  .from('product-images-2')
                  .getPublicUrl(`${escrow.id}/${imageData[0].name}`);
                imageUrl = publicUrl;
                console.log('Image URL:', imageUrl);
              }

              productDetailsMap[escrow.id] = {
                id: product.id,
                name: product.name,
                description: product.description,
                imageUrl,
                priceInSats: product.price
              };
            }
          }
        }
        console.log('Product details with images:', productDetailsMap);
        setProductDetails(productDetailsMap);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError(error instanceof Error ? error.message : 'Failed to load orders');
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleConfirmDelivery = (escrowId: string) => {
    // First update the delivery status
    setDeliveryStatuses(prev => ({
      ...prev,
      [escrowId]: true
    }));

    // Find the order being completed
    const orderToComplete = escrows.find(escrow => escrow.id === escrowId);
    if (!orderToComplete) return;

    // Add to completed orders
    setCompletedOrders(prev => [...prev, orderToComplete]);
    
    // Remove from in-progress orders
    setEscrows(prev => prev.filter(escrow => escrow.id !== escrowId));
    
    // Switch to completed tab
    setActiveTab('completed');
    
    toast.success('Delivery confirmed! Funds will be released to the seller.');
  };

  const handleRaiseDispute = async (escrowId: string) => {
    // TODO: Implement dispute raising
    toast.error('Dispute feature coming soon');
  };

  const renderOrderCard = (escrow: EscrowData, isCompleted: boolean = false) => {
    const product = escrow.id ? productDetails[escrow.id] : null;
    const isDelivered = isCompleted || deliveryStatuses[escrow.id];
    
    return (
      <Card key={escrow.id} className="bg-satstreet-medium border-satstreet-light">
        <CardHeader>
          <CardTitle className="text-lg">
            Order #{escrow.id ? escrow.id.substring(0, 8) : 'Unknown'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Product Summary */}
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-satstreet-dark/30">
                <img 
                  src={product?.imageUrl || '/placeholder.svg'} 
                  alt={product?.name || 'Product'} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', product?.imageUrl);
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
              <div>
                <h3 className="font-medium">{product?.name || escrow.product_name || 'Unknown Product'}</h3>
                <p className="text-sm text-muted-foreground">
                  {product?.description || escrow.product_description || 'No description available'}
                </p>
                <p className="font-mono text-sm mt-1">
                  {escrow.amount} XRP
                </p>
              </div>
            </div>

            {/* Escrow Status */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Escrow Status</h4>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="text-green-500" size={16} />
                  <span className="text-sm">Payment Locked in Escrow</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Package className="text-blue-500" size={16} />
                  <span className="text-sm">Seller Shipping Item</span>
                </div>
                <div className="flex items-center space-x-2">
                  {isDelivered ? (
                    <>
                      <CheckCircle2 className="text-green-500" size={16} />
                      <span className="text-sm text-green-500">Delivery Completed</span>
                    </>
                  ) : (
                    <>
                      <Clock className="text-muted-foreground" size={16} />
                      <span className="text-sm text-muted-foreground">Delivery Pending</span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>Escrow created: {new Date(escrow.created_time).toLocaleString()}</p>
                <p>Auto-release in: {new Date(escrow.finish_after).toLocaleString()}</p>
              </div>

              <div className="flex items-center space-x-2">
                <code className="text-xs bg-satstreet-dark px-2 py-1 rounded">
                  {escrow.destination.substring(0, 8)}...{escrow.destination.substring(escrow.destination.length - 8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(escrow.destination);
                    toast.success('Address copied to clipboard');
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Copy size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => window.open(`https://livenet.xrpl.org/accounts/${escrow.destination}`, '_blank')}
                >
                  <ExternalLink size={14} />
                </Button>
              </div>
            </div>

            {/* Actions */}
            {!isCompleted && !isDelivered && (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleConfirmDelivery(escrow.id)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Confirm Delivery
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRaiseDispute(escrow.id)}
                    className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                  >
                    Raise Dispute
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Orders</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="disputed">Disputed</TabsTrigger>
          </TabsList>

          <TabsContent value="in-progress" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : escrows.length > 0 ? (
              escrows.map(escrow => renderOrderCard(escrow, false))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No orders in progress
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedOrders.length > 0 ? (
              completedOrders.map(escrow => renderOrderCard(escrow, true))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No completed orders yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="disputed">
            <div className="text-center py-8 text-muted-foreground">
              No disputed orders
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default Orders;
