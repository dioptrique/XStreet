
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  description: string;
  priceInSats: number;
  shopName: string;
  shopId?: string; // Add shopId property
  imageUrl: string;
  priceChangePercentage: number;
  priceHistory: PriceHistoryEntry[];
  stockCount: number;
}

export interface PriceHistoryEntry {
  timestamp: string;
  price: number;
  explanation: string;
}

export const getProducts = async (): Promise<Product[]> => {
  // Fetch products from Supabase
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      price_history:price_history(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  
  // Transform the data to match our Product interface
  return products.map(product => {
    // Calculate price change percentage based on price history
    const priceHistory = product.price_history || [];
    let priceChangePercentage = 0;

    if (priceHistory.length > 1) {
      const currentPrice = product.price;
      const previousPrice = priceHistory[priceHistory.length - 2]?.price || currentPrice;
      priceChangePercentage = previousPrice !== 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      priceInSats: product.price,
      shopName: product.shop_name,
      shopId: product.shop_id, // Include shop_id 
      imageUrl: `/images/product${(Math.floor(Math.random() * 6) + 1)}.webp`, // Placeholder image
      priceChangePercentage: parseFloat(priceChangePercentage.toFixed(2)),
      priceHistory: (product.price_history || []).map((history: any) => ({
        timestamp: history.timestamp,
        price: history.price,
        explanation: history.explanation || ''
      })),
      stockCount: product.stock_count || 0
    };
  });
};

export const getProductById = async (id: string): Promise<Product | null> => {
  // Fetch a single product by ID from Supabase
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      price_history:price_history(*)
    `)
    .eq('id', id)
    .single();

  if (error || !product) {
    console.error('Error fetching product by ID:', error);
    return null;
  }

  // Calculate price change percentage
  const priceHistory = product.price_history || [];
  let priceChangePercentage = 0;

  if (priceHistory.length > 1) {
    const currentPrice = product.price;
    const previousPrice = priceHistory[priceHistory.length - 2]?.price || currentPrice;
    priceChangePercentage = previousPrice !== 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceInSats: product.price,
    shopName: product.shop_name,
    imageUrl: `/images/product${(Math.floor(Math.random() * 6) + 1)}.webp`, // Placeholder image
    priceChangePercentage: parseFloat(priceChangePercentage.toFixed(2)),
    priceHistory: (product.price_history || []).map((history: any) => ({
      timestamp: history.timestamp,
      price: history.price,
      explanation: history.explanation || ''
    })),
    stockCount: product.stock_count || 0
  };
};

export const getProductImages = async (productId: string): Promise<string[]> => {
  console.log('Fetching product images for product ID:', productId);
  
  try {
    // Check for product images in the database table regardless of bucket status
    const { data: productImages, error } = await supabase
      .from('product_images')
      .select('image_path')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    console.log('Product images database query result:', { productImages, error });

    if (error) {
      console.error('Error fetching product images from database:', error);
      return getPlaceholderImages();
    }

    if (!productImages || productImages.length === 0) {
      console.log('No product images found in database for product', productId);
      return getPlaceholderImages();
    }
    
    // Generate direct URLs for the website - bypassing storage bucket issues
    // Use hard-coded valid image URLs that will work for the demo
    const publicPath = 'https://wacicyiidaysfjdiaeim.supabase.co/storage/v1/object/public/product-images-2/';
    
    // Log the supabase project id for verification
    console.log('Supabase project ID:', supabase.projectRef);
    
    // Process the image paths to create proper URLs
    const processedImages = productImages.map(img => {
      // If the image path is already a full URL, use it
      if (img.image_path.startsWith('http')) {
        return img.image_path;
      }
      
      // Otherwise, construct the URL directly using the known pattern
      const fullUrl = `${publicPath}${encodeURIComponent(img.image_path)}`;
      console.log(`Generated URL for ${img.image_path}:`, fullUrl);
      return fullUrl;
    });
    
    // Return the processed images or fallback to placeholders if all are invalid
    const validImages = processedImages.filter(url => url && !url.includes('undefined'));
    return validImages.length > 0 ? validImages : getPlaceholderImages();
  } catch (err) {
    console.error('Unexpected error in getProductImages:', err);
    return getPlaceholderImages();
  }
};

// Helper function to get placeholder images
const getPlaceholderImages = (): string[] => {
  console.log('Using placeholder images as fallback');
  return [
    getRandomPlaceholder(),
    getRandomPlaceholder(),
    getRandomPlaceholder()
  ];
};

// Helper function to get a random placeholder image
const getRandomPlaceholder = (): string => {
  const placeholders = [
    '/images/product1.webp',
    '/images/product2.webp',
    '/images/product3.webp',
    '/images/product4.webp',
    '/images/product5.webp',
    '/images/product6.webp',
    '/placeholder.svg'
  ];
  return placeholders[Math.floor(Math.random() * placeholders.length)];
};

// Helper function for Wallet page
export const getWalletInfo = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_balance, username')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching wallet info:', error);
    return { 
      balance: 0, 
      username: 'User',
      publicKey: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      transactions: [] 
    };
  }
  
  // Mock transactions for demonstration with proper literal types
  const mockTransactions = [
    {
      id: '1',
      type: 'deposit' as 'deposit',  // Using type assertion to specify literal type
      amount: 50000,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      description: 'Initial deposit'
    },
    {
      id: '2',
      type: 'purchase' as 'purchase',  // Using type assertion to specify literal type
      amount: -12500,
      timestamp: new Date(Date.now() - 43200000).toISOString(),
      description: 'Purchase of UltraFlex Running Shoes',
      productId: 'bf01fe26-f74d-4655-91ff-e32d257fc41d'
    },
    {
      id: '3',
      type: 'deposit' as 'deposit',  // Using type assertion to specify literal type
      amount: 25000,
      timestamp: new Date(Date.now() - 21600000).toISOString(),
      description: 'Lightning payment received'
    }
  ];
  
  return { 
    balance: data?.wallet_balance || 0, 
    username: data?.username || 'User',
    publicKey: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
    transactions: mockTransactions
  };
};

export const uploadProductImage = async (file: File, productId: string) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${productId}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  
  // Check if the bucket exists, if not try to create it
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some(bucket => bucket.name === 'product-images-2')) {
    console.error('Product-images-2 bucket does not exist in storage. Images cannot be uploaded.');
  }
  
  const { error: uploadError } = await supabase.storage
    .from('product-images-2')
    .upload(filePath, file);
    
  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    return null;
  }
  
  const { data } = supabase.storage
    .from('product-images-2')
    .getPublicUrl(filePath);
    
  // Save the image reference to the product_images table
  const { error: insertError } = await supabase.from('product_images').insert({
    product_id: productId,
    image_path: filePath, // Store just the path, not the full URL
    is_primary: false
  });
  
  if (insertError) {
    console.error('Error saving image reference:', insertError);
  }
  
  return data.publicUrl;
};
