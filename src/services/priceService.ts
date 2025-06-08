
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Triggers a price update by calling the price-engine Edge Function
 */
export const triggerPriceUpdate = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('price-engine', {
      body: {
        action: 'updateAllPrices'
      }
    });
    
    if (error) {
      console.error('Error triggering price update:', error);
      toast.error('Failed to update prices');
      return false;
    }
    
    console.log('Price update triggered successfully:', data);
    toast.success(`Prices updated successfully - ${data.updatedProducts} products`);
    return true;
  } catch (err) {
    console.error('Error in triggerPriceUpdate:', err);
    toast.error('Failed to update prices');
    return false;
  }
};

/**
 * Fetches latest prices from the server for a specific product
 */
export const updateProductPrice = async (productId: string): Promise<boolean> => {
  try {
    console.log(`Updating price for product ${productId}`);
    
    const { data, error } = await supabase.functions.invoke('price-engine', {
      body: {
        action: 'updateProductPrice',
        payload: {
          productId
        }
      }
    });
    
    if (error) {
      console.error('Error updating product price:', error);
      return false;
    }
    
    console.log('Product price updated successfully:', data);
    return true;
  } catch (err) {
    console.error(`Error updating product price for ${productId}:`, err);
    return false;
  }
};

/**
 * Gets current market factors affecting prices
 */
export const getMarketFactors = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('price-engine', {
      body: {
        action: 'getMarketFactors'
      }
    });
    
    if (error) {
      console.error('Error getting market factors:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error in getMarketFactors:', err);
    return null;
  }
};

/**
 * Fetches latest prices from the server without triggering a new price generation
 * This is used for the refresh functionality in the UI
 */
export const fetchLatestPrices = async (): Promise<boolean> => {
  try {
    console.log('Fetching latest prices...');
    
    // Call the price-engine Edge Function to update all prices
    return await triggerPriceUpdate();
  } catch (err) {
    console.error('Error in fetchLatestPrices:', err);
    toast.error('Failed to fetch latest prices');
    return false;
  }
};
