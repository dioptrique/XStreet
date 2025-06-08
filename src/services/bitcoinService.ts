
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Types for Bitcoin-related data
 */
export interface BitcoinTransaction {
  txid: string;
  type: 'sent' | 'received';
  amount: number;
  confirmations: number;
  time: string;
  otherAddress: string;
}

export interface WalletInfo {
  address: string;
  balance: number;
  balanceBTC: string;
  transactions: BitcoinTransaction[];
  network: string;
}

/**
 * Get Bitcoin wallet information for a user
 */
export const getWalletInfo = async (userId: string): Promise<WalletInfo | null> => {
  try {
    console.log('Fetching wallet info for user:', userId);
    
    const { data, error } = await supabase.functions.invoke('bitcoin-service', {
      body: {
        action: 'getWalletInfo',
        payload: { userId }
      }
    });
    
    if (error) {
      console.error('Error fetching wallet info:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error in getWalletInfo:', err);
    return null;
  }
};

/**
 * Generate a new Bitcoin testnet address
 */
export const generateAddress = async (userId: string, forShop: boolean = false): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('bitcoin-service', {
      body: {
        action: 'generateAddress',
        payload: { 
          userId,
          forShop
        }
      }
    });
    
    if (error) {
      console.error('Error generating address:', error);
      return null;
    }
    
    return data.address;
  } catch (err) {
    console.error('Error in generateAddress:', err);
    return null;
  }
};

/**
 * Create a Bitcoin transaction for a purchase
 */
export const createTransaction = async (
  userId: string, 
  productId: string, 
  amount: number,
  shopId: string,
  recipientAddress: string
): Promise<{success: boolean, txHash?: string, error?: string}> => {
  try {
    const { data, error } = await supabase.functions.invoke('bitcoin-service', {
      body: {
        action: 'createTransaction',
        payload: { 
          userId,
          productId,
          amount,
          shopId,
          recipientAddress
        }
      }
    });
    
    if (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    }
    
    if (data.error) {
      return { success: false, error: data.error };
    }
    
    return { 
      success: true, 
      txHash: data.txHash 
    };
  } catch (err: any) {
    console.error('Error in createTransaction:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Verify the status of a Bitcoin transaction
 */
export const verifyTransaction = async (txHash: string): Promise<{confirmed: boolean, confirmations: number}> => {
  try {
    const { data, error } = await supabase.functions.invoke('bitcoin-service', {
      body: {
        action: 'verifyTransaction',
        payload: { txHash }
      }
    });
    
    if (error) {
      console.error('Error verifying transaction:', error);
      return { confirmed: false, confirmations: 0 };
    }
    
    return {
      confirmed: data.confirmed,
      confirmations: data.confirmations
    };
  } catch (err) {
    console.error('Error in verifyTransaction:', err);
    return { confirmed: false, confirmations: 0 };
  }
};

/**
 * Request testnet Bitcoin from a faucet
 */
export const requestFromFaucet = async (address: string): Promise<{success: boolean, message?: string}> => {
  try {
    const { data, error } = await supabase.functions.invoke('bitcoin-service', {
      body: {
        action: 'getTestnetFaucet',
        payload: { address }
      }
    });
    
    if (error) {
      console.error('Error requesting from faucet:', error);
      return { success: false };
    }
    
    toast.success('Testnet Bitcoin requested successfully!');
    return {
      success: true,
      message: data.message
    };
  } catch (err) {
    console.error('Error in requestFromFaucet:', err);
    toast.error('Failed to request testnet Bitcoin');
    return { success: false };
  }
};

/**
 * Get balance from a Bitcoin address
 */
export const getBalanceFromAddress = async (address: string): Promise<{balance: number} | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('bitcoin-service', {
      body: {
        action: 'getBalanceFromAddress',
        payload: { address }
      }
    });
    
    if (error) {
      console.error('Error getting balance from address:', error);
      return null;
    }
    
    return {
      balance: data.balance
    };
  } catch (err) {
    console.error('Error in getBalanceFromAddress:', err);
    return null;
  }
};
