
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, ExternalLink } from 'lucide-react';

const LightningTransactions = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  // Blockchain explorer URL
  const blockchainExplorerUrl = "https://www.blockchain.com/explorer/addresses/btc/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
  
  // Redirect function for blockchain explorer
  const redirectToBlockchainExplorer = () => {
    window.open(blockchainExplorerUrl, '_blank', 'noopener,noreferrer');
  };
  
  // Mock transactions data
  const transactions = [
    {
      id: 'tx1',
      amount: 1500,
      timestamp: '2024-05-17T08:22:43Z',
      status: 'completed',
      description: 'Purchase transaction'
    },
    {
      id: 'tx2',
      amount: 2000,
      timestamp: '2024-05-16T12:45:10Z',
      status: 'completed',
      description: 'Inventory restock'
    },
    {
      id: 'tx3',
      amount: 1250,
      timestamp: '2024-05-15T19:30:22Z',
      status: 'completed',
      description: 'Market adjustment'
    },
    {
      id: 'tx4',
      amount: 1800,
      timestamp: '2024-05-13T09:15:33Z',
      status: 'completed',
      description: 'Demand increase'
    }
  ];
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          Back to Product
        </Button>
        
        <div className="flex items-center mb-6">
          <Zap size={24} className="mr-2 text-bitcoin" />
          <h1 className="text-2xl font-bold">Lightning Network Transactions</h1>
        </div>
        
        <p className="mb-4 text-muted-foreground">
          These transactions represent Lightning Network activity related to this product, 
          which influences the dynamic pricing model through demand indicators.
        </p>
        
        <Button
          variant="outline"
          className="mb-8 flex items-center gap-2"
          onClick={redirectToBlockchainExplorer}
        >
          <ExternalLink size={16} />
          View on Blockchain Explorer
        </Button>
        
        <div 
          className="bg-satstreet-medium p-6 rounded-lg border border-satstreet-light cursor-pointer hover:border-bitcoin transition-colors"
          onClick={redirectToBlockchainExplorer}
          title="Click to view on Blockchain Explorer"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Transaction History</h2>
            <ExternalLink size={16} className="text-bitcoin" />
          </div>
          
          <div className="space-y-4">
            {transactions.map(tx => (
              <div key={tx.id} className="p-4 border border-satstreet-light rounded-md bg-satstreet-dark/30 flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <Zap size={14} className="mr-2 text-bitcoin" />
                    <span className="text-sm font-mono">{tx.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(tx.timestamp).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm">{tx.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-bitcoin font-mono font-medium">
                    {tx.amount.toLocaleString()} sats
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default LightningTransactions;
