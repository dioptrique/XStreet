
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PriceIndicator from './PriceIndicator';
import { Product } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getProductImages } from '@/services/api';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [productImage, setProductImage] = useState<string>(product.imageUrl);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  
  // Try to get a better image from the product_images table
  useEffect(() => {
    const loadMainImage = async () => {
      try {
        console.log(`Loading images for product: ${product.id} - ${product.name}`);
        const images = await getProductImages(product.id);
        console.log('Loaded images for ProductCard:', images);
        
        if (images && images.length > 0) {
          setProductImage(images[0]);
          console.log('Setting ProductCard image to:', images[0]);
        } else {
          console.log('No valid images found, using default product image');
        }
      } catch (error) {
        console.error('Failed to load product card image:', error);
      }
    };
    
    loadMainImage();
  }, [product.id, product.imageUrl]);
  
  const handleViewProduct = () => {
    navigate(`/product/${product.id}`);
  };
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product);
  };

  const handleStockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open('https://btc.tokenview.io/en/tx/cb01ea705494ce66d7e5b7cb51bb5b39b8e8ce31e168d1bd7dda253af359cc77', '_blank');
  };

  // Get a truncated version of the description if it's too long
  const truncatedDescription = product.description && product.description.length > 60 
    ? `${product.description.substring(0, 60)}...` 
    : product.description;

  const handleImageLoad = () => {
    console.log('Product card image loaded successfully:', productImage);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Product card image failed to load:', productImage);
    setImageError(true);
    // Use a local fallback image
    e.currentTarget.src = '/placeholder.svg';
  };

  return (
    <Card 
      onClick={handleViewProduct}
      className="overflow-hidden border-satstreet-light hover:border-bitcoin/50 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-satstreet-medium"
    >
      <div className="aspect-square overflow-hidden bg-satstreet-dark/50">
        <img 
          src={productImage} 
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
      
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{product.shopName}</div>
        <h3 className="font-medium text-lg mt-1">{product.name}</h3>
        {truncatedDescription && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{truncatedDescription}</p>
        )}
        <div className="mt-2">
          <PriceIndicator 
            priceInSats={product.priceInSats} 
            priceChangePercentage={product.priceChangePercentage}
          />
        </div>
        <div className="mt-2 flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  onClick={handleStockClick}
                  className="inline-flex items-center text-xs cursor-pointer text-muted-foreground hover:text-bitcoin"
                >
                  <span>Stock: {product.stockCount || 0}</span>
                  <ExternalLink size={12} className="ml-1" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] bg-satstreet-dark border-satstreet-light">
                <p>Stock verified via XRP blockchain commitments from the supplier using OP_RETURN</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleViewProduct}
          className="text-xs"
        >
          View Details
        </Button>
        <Button 
          variant="default" 
          size="sm"
          onClick={handleAddToCart}
          className="text-xs bg-bitcoin hover:bg-bitcoin-dark"
        >
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
