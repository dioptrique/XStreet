
import { useCallback, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { fetchLatestPrices } from '@/services/priceService';

interface UseRefreshDataProps {
  onRefresh?: () => void;
  intervalMs?: number;
  shouldFetchLatestPrices?: boolean;
}

// Change the default interval here (currently 60000ms = 60 seconds)
export const useRefreshData = ({ 
  onRefresh, 
  intervalMs = 300000, // Change this value to modify the default interval in milliseconds
  shouldFetchLatestPrices = true 
}: UseRefreshDataProps = {}) => {
  const queryClient = useQueryClient();
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(intervalMs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      console.log('Starting data refresh process...');
      
      // If this refresh should fetch latest prices, call the API
      if (shouldFetchLatestPrices) {
        const success = await fetchLatestPrices();
        if (success) {
          console.log('Latest prices fetched successfully');
        } else {
          console.error('Failed to fetch latest prices');
        }
      }
      
      // Invalidate all relevant queries to force a fresh fetch
      console.log('Invalidating queries to force refetch...');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['product'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] })
      ]);
      
      console.log('Queries invalidated, data should refresh');
      
      // Force refetching of active queries
      await queryClient.refetchQueries({ 
        queryKey: ['products'],
        type: 'active'
      });
      await queryClient.refetchQueries({ 
        queryKey: ['product'],
        type: 'active'
      });
      
      // If this refresh should fetch latest prices, show a toast notification
      if (shouldFetchLatestPrices) {
        toast.info('Prices updated with latest market data');
      }
      
      // Call the optional onRefresh callback if provided
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setIsRefreshing(false);
      setTimeUntilRefresh(intervalMs);
      console.log('Refresh process complete');
    }
  }, [queryClient, onRefresh, intervalMs, shouldFetchLatestPrices]);

  // Format the time until refresh
  const formattedTimeUntilRefresh = `${Math.floor(timeUntilRefresh / 1000)}s`;

  // Set up the countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilRefresh(prevTime => {
        const newTime = prevTime - 1000;
        if (newTime <= 0) {
          refreshData();
          return intervalMs;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshData, intervalMs]);

  return { refreshData, isRefreshing, formattedTimeUntilRefresh };
};

export default useRefreshData;
