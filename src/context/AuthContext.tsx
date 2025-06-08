
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/components/ui/use-toast';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  walletBalance: number;
  bitcoinAddress?: string;  // New: Bitcoin testnet address
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  generateBitcoinAddress: () => Promise<string | null>;  // New: Generate Bitcoin address
  refreshWalletBalance: () => Promise<void>;  // New: Refresh wallet balance
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        
        if (newSession?.user) {
          try {
            // Fetch the user profile
            setTimeout(async () => {
              const { data, error } = await supabase
                .from('profiles')
                .select('id, username, email, wallet_balance, bitcoin_address')
                .eq('id', newSession.user.id)
                .single();
              
              if (error) throw error;
              
              if (data) {
                setUser({
                  id: data.id,
                  username: data.username,
                  email: data.email,
                  walletBalance: data.wallet_balance,
                  bitcoinAddress: data.bitcoin_address
                });
              }
            }, 0);
          } catch (error) {
            console.error("Error fetching user profile:", error);
          }
        } else {
          setUser(null);
        }
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, email, wallet_balance, bitcoin_address')
            .eq('id', currentSession.user.id)
            .single();
          
          if (error) throw error;
          
          if (data) {
            setUser({
              id: data.id,
              username: data.username,
              email: data.email,
              walletBalance: data.wallet_balance,
              bitcoinAddress: data.bitcoin_address
            });
          }
        }
      } catch (e) {
        console.error("Error during auth initialization:", e);
        setError(e instanceof Error ? e.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (e) {
      console.error("Error during logout:", e);
      setError(e instanceof Error ? e.message : 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate a Bitcoin testnet address for the user
  const generateBitcoinAddress = async (): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to generate a XRP address",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      setIsLoading(true);
      
      // Call our edge function to generate an address
      const { data, error } = await supabase.functions.invoke('bitcoin-service', {
        body: {
          action: 'generateAddress',
          payload: { userId: user.id }
        }
      });
      
      if (error) throw error;
      
      if (data?.address) {
        // Update local user state
        setUser(prev => prev ? {...prev, bitcoinAddress: data.address} : null);
        
        toast({
          title: "XRP Address Generated",
          description: "Your testnet XRP address is ready to use",
        });
        
        return data.address;
      }
      
      return null;
    } catch (e) {
      console.error("Error generating XRP address:", e);
      toast({
        title: "Address Generation Failed",
        description: e instanceof Error ? e.message : "Could not generate XRP address",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Refresh the user's wallet balance
  const refreshWalletBalance = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setUser(prev => prev ? {...prev, walletBalance: data.wallet_balance} : null);
      }
    } catch (e) {
      console.error("Error refreshing wallet balance:", e);
    }
  };

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
    generateBitcoinAddress,
    refreshWalletBalance
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
