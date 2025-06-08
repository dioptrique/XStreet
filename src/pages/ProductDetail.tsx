import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProductById, getProductImages } from '@/services/api';
import { useRefreshData } from '@/hooks/useRefreshData';
import { useCart } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PriceIndicator from '@/components/PriceIndicator';
import PriceFormula from '@/components/PriceFormula';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from "sonner";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { 
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { ExternalLink, RefreshCw } from 'lucide-react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <div className="bg-satstreet-medium p-4 border border-satstreet-light rounded-md shadow-lg">
        <p className="font-medium text-sm">
          {new Date(data.timestamp).toLocaleString()}
        </p>
        <p className="text-bitcoin font-mono font-bold mt-1">
          {(data.price).toLocaleString()} XRP
        </p>
        <p className="mt-2 text-xs text-muted-foreground max-w-60">
          {data.explanation}
        </p>
      </div>
    );
  }

  return null;
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [selectedPriceEntry, setSelectedPriceEntry] = useState<any>(null);
  
  // Fetch product details with react-query
  const { 
    data: product, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id || ''),
    enabled: !!id
  });
  
  // Fetch product images - updated for debugging
  useEffect(() => {
    const loadImages = async () => {
      if (id) {
        console.log('Attempting to load images for product ID:', id);
        const images = await getProductImages(id);
        console.log('Loaded images:', images);
        
        if (images && images.length > 0) {
          setProductImages(images);
        } else {
          // If no images, use the main product image or a placeholder
          setProductImages(product?.imageUrl ? [product.imageUrl] : ['/placeholder.svg']);
          console.log('No images found, using placeholder');
        }
      }
    };
    
    loadImages();
  }, [id, product]);
  
  // Set up automatic refresh - modify the interval here (30000ms = 30 seconds)
  const { 
    isRefreshing,
    formattedTimeUntilRefresh,
    refreshData
  } = useRefreshData({
    onRefresh: () => {
      console.log('Refreshing product detail from ProductDetail page');
      refetch();
      toast.success("Price updated!", {
        description: "Latest market data has been fetched for this product",
      });
    },
    intervalMs: 300000 // Change this value to modify refresh interval in milliseconds
  });
  
  // Handle manual refresh
  const handleManualRefresh = () => {
    console.log('Manual refresh triggered from product detail');
    refreshData();
  };

  // Handle chart point selection
  const handleChartMouseMove = (chartState: any) => {
    if (chartState && chartState.isTooltipActive && chartState.activePayload && chartState.activePayload[0]) {
      setSelectedPriceEntry(chartState.activePayload[0].payload);
    }
  };
  
  // Handle chart mouse leave
  const handleChartMouseLeave = () => {
    setSelectedPriceEntry(null);
  };

  const handleStockClick = () => {
    window.open('https://btc.tokenview.io/en/tx/cb01ea705494ce66d7e5b7cb51bb5b39b8e8ce31e168d1bd7dda253af359cc77', '_blank');
  };
  
  useEffect(() => {
    // Set the initial price entry to the latest one when product data is loaded
    if (product && product.priceHistory.length > 0) {
      const latestEntry = product.priceHistory[product.priceHistory.length - 1];
      setSelectedPriceEntry(latestEntry);
    }
  }, [product]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-md" />
            <div>
              <Skeleton className="h-10 w-3/4 mb-4" />
              <Skeleton className="h-6 w-1/4 mb-6" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-8" />
              <Skeleton className="h-64 w-full mb-6" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-red-500">
              Product Not Found
            </h1>
            <p className="mb-6 text-muted-foreground">
              Sorry, we couldn't find the product you're looking for.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-bitcoin hover:bg-bitcoin-dark"
            >
              Back to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Convert price history for the chart and scale down the prices
  const chartData = product.priceHistory.map(entry => ({
    ...entry,
    price: entry.price, // No need to divide by 10000 anymore
    date: new Date(entry.timestamp).toLocaleDateString()
  }));
  
  const handleAddToCart = () => {
    addItem(product);
  };
  
  // Get the latest price history entry or the selected one from the chart
  const displayedHistoryEntry = selectedPriceEntry || 
    (product.priceHistory.length > 0 ? product.priceHistory[product.priceHistory.length - 1] : undefined);
  
  // Display price from selected entry or current price
  const displayedPrice = selectedPriceEntry ? selectedPriceEntry.price : product.priceInSats;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div className="aspect-square overflow-hidden rounded-lg border border-satstreet-light bg-satstreet-dark/30">
              {productImages.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {productImages.map((image, index) => (
                      <CarouselItem key={index}>
                        <div className="aspect-square w-full">
                          <img 
                            src={image} 
                            alt={`${product?.name || 'Product'} - image ${index + 1}`} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image failed to load:', image);
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="-left-4 bg-satstreet-medium border-satstreet-light" />
                  <CarouselNext className="-right-4 bg-satstreet-medium border-satstreet-light" />
                </Carousel>
              ) : (
                <div className="h-full flex items-center justify-center bg-satstreet-dark/30">
                  <img 
                    src={product?.imageUrl || '/placeholder.svg'} 
                    alt={product?.name || 'Product'} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {productImages.map((image, index) => (
                  <div 
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square cursor-pointer overflow-hidden rounded-md border ${
                      currentImageIndex === index 
                        ? 'border-bitcoin' 
                        : 'border-satstreet-light'
                    }`}
                  >
                    <img 
                      src={image}
                      alt={`${product?.name || 'Product'} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">{product.name}</h1>
            </div>
            <p className="text-muted-foreground mb-4">{product.shopName}</p>
            
            <div className="mb-6">
              <PriceIndicator 
                priceInSats={product.priceInSats} 
                priceChangePercentage={product.priceChangePercentage}
                size="lg"
              />
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                <span>Next price update in: {formattedTimeUntilRefresh}</span>
                <Button
                  onClick={handleManualRefresh}
                  variant="ghost"
                  size="sm"
                  className={`p-1 rounded-full hover:bg-satstreet-light transition-all ${isRefreshing ? 'animate-spin text-bitcoin' : ''}`}
                  title="Refresh now"
                  disabled={isRefreshing}
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center mb-4">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleStockClick}
                      className="inline-flex items-center text-sm cursor-pointer hover:text-bitcoin transition-colors"
                    >
                      <span className="font-medium">Stock: {product.stockCount || 0}</span>
                      <ExternalLink size={14} className="ml-1" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px] bg-satstreet-dark border-satstreet-light">
                    <p>Stock verified via XRP blockchain commitments from the supplier</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            
            <p className="text-foreground mb-8">{product.description}</p>
            
            {/* Price History Chart */}
            <div className="mb-8 bg-satstreet-medium p-4 rounded-lg border border-satstreet-light">
              <h2 className="text-lg font-medium mb-4">Price History</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={chartData}
                    onMouseMove={handleChartMouseMove}
                    onMouseLeave={handleChartMouseLeave}
                  >
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C3FF" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00C3FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3348" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF" 
                      tick={false}
                      axisLine={true}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      tick={{fill: '#9CA3AF'}}
                      tickFormatter={(value) => value.toLocaleString()} // Format Y-axis values
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#00C3FF" 
                      fillOpacity={1}
                      fill="url(#colorPrice)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Dynamic price formula that updates when chart points are selected */}
            <div className="mb-8">
              <PriceFormula 
                currentPrice={displayedPrice}
                historyEntry={displayedHistoryEntry}
                productId={product.id}
              />
              {selectedPriceEntry && (
                <div className="mt-2 text-xs text-bitcoin">
                  <span className="flex items-center gap-1">
                    <span>🔍</span>
                    Viewing pricing data from {new Date(selectedPriceEntry.timestamp).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleAddToCart}
              size="lg"
              className="w-full bg-bitcoin hover:bg-bitcoin-dark"
            >
              Add to Cart ({product.priceInSats.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XRP)
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ProductDetail;
