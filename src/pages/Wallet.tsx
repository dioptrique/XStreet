import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bitcoin, RefreshCw, Copy, ExternalLink, ArrowUpRight, ArrowDownLeft, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getWalletInfo, BitcoinTransaction, requestFromFaucet } from '@/services/bitcoinService';

const Wallet = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, generateBitcoinAddress } = useAuth();
  const queryClient = useQueryClient();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [requestingFaucet, setRequestingFaucet] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);
  
  // Query to fetch wallet information
  const { data: walletInfo, isLoading, error, refetch } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => user ? getWalletInfo(user.id) : null,
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });
  
  const handleCopyAddress = () => {
    if (walletInfo?.address) {
      navigator.clipboard.writeText(walletInfo.address);
      setCopiedAddress(true);
      toast.success('Bitcoin address copied to clipboard');
      
      setTimeout(() => setCopiedAddress(false), 3000);
    }
  };
  
  const handleGenerateAddress = async () => {
    const address = await generateBitcoinAddress();
    if (address) {
      refetch();
    }
  };
  
  const handleRequestFaucet = async () => {
    if (!walletInfo?.address) return;
    
    setRequestingFaucet(true);
    try {
      const result = await requestFromFaucet(walletInfo.address);
      
      if (result.success) {
        // Refresh wallet data after a delay to simulate transaction confirmation
        setTimeout(() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
        }, 2000);
      }
    } finally {
      setRequestingFaucet(false);
    }
  };
  
  // Format timestamp to readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <div className="animate-pulse text-lg">Loading wallet...</div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect due to useEffect
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">XRP Wallet</h1>
          
          <Button 
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card */}
          <Card className="col-span-1 bg-satstreet-medium border-satstreet-light">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Your Balance</CardTitle>
              <CardDescription>XRP wallet</CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="animate-pulse">Loading balance...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bitcoin className="text-bitcoin" size={24} />
                      <span className="font-mono font-bold text-2xl text-bitcoin">
                        {user?.walletBalance?.toLocaleString() || 0}
                      </span>
                      <span className="text-muted-foreground">XRP</span>
                    </div>
                    
                    <div className="text-muted-foreground text-sm mt-1">
                      ≈ {walletInfo?.balanceBTC || '0.00000000'} XRP
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-satstreet-light">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Your XRP Address</div>
                      
                      {!walletInfo?.address && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateAddress}
                          className="h-7 px-2 text-xs"
                        >
                          Generate
                        </Button>
                      )}
                    </div>
                    
                    {walletInfo?.address ? (
                      <div className="flex items-center">
                        <div className="bg-satstreet-dark p-2 rounded text-xs font-mono flex-1 truncate">
                          {walletInfo.address}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleCopyAddress}
                          className="ml-1 h-8 w-8 p-0"
                        >
                          {copiedAddress ? <span className="text-green-500 text-xs">✓</span> : <Copy size={14} />}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No address generated yet
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        <span className="font-medium">Network:</span> {walletInfo?.network || 'testnet'}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRequestFaucet}
                        disabled={!walletInfo?.address || requestingFaucet}
                        className="w-full mt-2 bg-bitcoin/10 hover:bg-bitcoin/20 border-bitcoin/20 text-xs"
                      >
                        <PlusCircle size={14} className="mr-2" />
                        {requestingFaucet ? 'Requesting...' : 'Request Testnet XRP from Faucet'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Transactions */}
          <Card className="col-span-1 lg:col-span-2 bg-satstreet-medium border-satstreet-light">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Transaction History</CardTitle>
              <CardDescription>Your recent XRP transactions</CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-pulse">Loading transactions...</div>
                </div>
              ) : walletInfo?.transactions && walletInfo.transactions.length > 0 ? (
                <div className="space-y-1">
                  {walletInfo.transactions.map((tx: BitcoinTransaction, i: number) => (
                    <div 
                      key={tx.txid} 
                      className="p-3 rounded hover:bg-satstreet-dark/20 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === 'received' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          {tx.type === 'received' ? (
                            <ArrowDownLeft size={16} className="text-green-500" />
                          ) : (
                            <ArrowUpRight size={16} className="text-red-500" />
                          )}
                        </div>
                        
                        <div className="ml-3">
                          <div className="text-sm font-medium">
                            {tx.type === 'received' ? 'Received' : 'Sent'} XRP
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimestamp(tx.time)}
                          </div>
                          <div className="text-xs font-mono mt-1 text-muted-foreground">
                            {tx.txid.substring(0, 8)}...{tx.txid.substring(tx.txid.length - 8)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-mono font-medium ${tx.type === 'received' ? 'text-green-500' : 'text-red-500'}`}>
                          {tx.type === 'received' ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()} XRP
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tx.confirmations} confirmation{tx.confirmations !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center">
                  <Bitcoin size={24} className="text-muted-foreground mb-2" />
                  <div className="text-muted-foreground">No transactions yet</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Transactions will appear here once you send or receive XRP
                  </div>
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t border-satstreet-light">
                <a 
                  href="https://mempool.space/testnet" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-bitcoin hover:underline flex items-center justify-end"
                >
                  <span>View on XRP Explorer</span>
                  <ExternalLink size={14} className="ml-1" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Wallet;
