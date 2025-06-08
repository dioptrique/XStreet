
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Bitcoin testnet API endpoints
const BLOCKCHAIN_INFO_API = "https://api.blockchain.info/testnet3";
const BLOCKCYPHER_API = "https://api.blockcypher.com/v1/btc/test3";
const MEMPOOL_API = "https://mempool.space/testnet/api";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different Bitcoin-related actions
    switch (action) {
      case 'getWalletInfo':
        return handleGetWalletInfo(payload, supabase);
      
      case 'generateAddress':
        return handleGenerateAddress(payload, supabase);
      
      case 'createTransaction':
        return handleCreateTransaction(payload, supabase);
        
      case 'verifyTransaction':
        return handleVerifyTransaction(payload, supabase);
        
      case 'getTestnetFaucet':
        return handleGetTestnetFaucet(payload);
        
      case 'getBalanceFromAddress':
        return handleGetBalanceFromAddress(payload);
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Get wallet information including balance and transactions
async function handleGetWalletInfo(payload: any, supabase: any) {
  const { userId } = payload;
  
  try {
    // Get user's wallet address from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('bitcoin_address, wallet_balance')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    // If user has no Bitcoin address yet, generate one
    if (!profileData.bitcoin_address) {
      // Generate a testnet address (in real app, would use HD wallet derivation)
      const testnetAddress = `tb1q${Array.from({length: 38}, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join('')}`;
      
      // Update user profile with the new address
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ bitcoin_address: testnetAddress })
        .eq('id', userId);
        
      if (updateError) throw updateError;
      
      profileData.bitcoin_address = testnetAddress;
    }
    
    // Get mock transaction history
    // In a real implementation, this would query the testnet blockchain APIs
    const recentTransactions = await getMockTransactions(profileData.bitcoin_address, 5);
    
    return new Response(
      JSON.stringify({
        address: profileData.bitcoin_address,
        balance: profileData.wallet_balance || 0,
        balanceBTC: (profileData.wallet_balance / 100000000).toFixed(8),
        transactions: recentTransactions,
        network: 'testnet'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting wallet info:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Generate a new Bitcoin testnet address
async function handleGenerateAddress(payload: any, supabase: any) {
  const { userId, forShop } = payload;
  
  try {
    // Generate a testnet address
    // In a real implementation, this would use a Bitcoin library to generate addresses
    const testnetAddress = `tb1q${Array.from({length: 38}, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join('')}`;
    
    if (forShop) {
      // If generating for a shop, update seller_shops table
      const { data: shopData, error: shopError } = await supabase
        .from('seller_shops')
        .update({ public_bitcoin_address: testnetAddress })
        .eq('owner_id', userId)
        .select()
        .single();
        
      if (shopError) throw shopError;
      
      return new Response(
        JSON.stringify({ 
          address: testnetAddress,
          shopId: shopData.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // If generating for a user, update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ bitcoin_address: testnetAddress })
        .eq('id', userId);
        
      if (updateError) throw updateError;
      
      return new Response(
        JSON.stringify({ address: testnetAddress }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error generating address:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Create a simulated Bitcoin transaction for purchases
async function handleCreateTransaction(payload: any, supabase: any) {
  const { 
    userId, 
    productId, 
    amount, // in satoshis
    recipientAddress,
    shopId
  } = payload;
  
  try {
    // Get user's wallet balance
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();
      
    if (userError) throw userError;
    
    // Check if user has enough balance
    if (userData.wallet_balance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance', code: 'INSUFFICIENT_FUNDS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate a random transaction hash for the testnet transaction
    const txHash = Array.from({length: 64}, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join('');
    
    // Update user's balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: userData.wallet_balance - amount })
      .eq('id', userId);
      
    if (updateError) throw updateError;
    
    // Record transaction in bitcoin_transactions table
    const { error: txError } = await supabase
      .from('bitcoin_transactions')
      .insert({
        user_id: userId,
        product_id: productId,
        shop_id: shopId,
        amount: amount,
        tx_hash: txHash,
        status: 'confirmed',
        type: 'purchase',
        recipient_address: recipientAddress
      });
      
    if (txError) {
      console.error('Error recording transaction:', txError);
      // If transaction record fails, revert the balance change
      await supabase
        .from('profiles')
        .update({ wallet_balance: userData.wallet_balance })
        .eq('id', userId);
        
      throw txError;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        txHash: txHash,
        amount: amount,
        balanceAfter: userData.wallet_balance - amount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Verify a Bitcoin transaction's status
async function handleVerifyTransaction(payload: any, supabase: any) {
  const { txHash } = payload;
  
  try {
    // In a real implementation, this would query the testnet blockchain API to check the transaction status
    // For this simulation, we'll query our database and return the status
    
    const { data: txData, error: txError } = await supabase
      .from('bitcoin_transactions')
      .select('*')
      .eq('tx_hash', txHash)
      .single();
      
    if (txError) {
      // If transaction not found, simulate blockchain API call
      const simulatedResponse = {
        confirmed: Math.random() > 0.3, // 70% chance of being confirmed
        confirmations: Math.floor(Math.random() * 6),
        block_height: Math.floor(Date.now() / 1000 / 600), // Rough block height estimate
        time: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 3600)
      };
      
      return new Response(
        JSON.stringify(simulatedResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        confirmed: txData.status === 'confirmed',
        confirmations: txData.status === 'confirmed' ? 6 : Math.floor(Math.random() * 3),
        block_height: Math.floor(Date.now() / 1000 / 600), // Rough block height estimate
        time: Math.floor(new Date(txData.created_at).getTime() / 1000)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Request testnet Bitcoin from a faucet (simulated)
async function handleGetTestnetFaucet(payload: any) {
  const { address } = payload;
  
  try {
    // In a real implementation, this would make a request to a testnet faucet API
    // For this simulation, we'll return a simulated response
    
    return new Response(
      JSON.stringify({
        success: true,
        txHash: Array.from({length: 64}, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(''),
        amount: 1000000, // 0.01 BTC in satoshis
        message: 'Testnet bitcoin has been sent to your address'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error requesting from faucet:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Get balance from a Bitcoin address
async function handleGetBalanceFromAddress(payload: any) {
  const { address } = payload;
  
  try {
    // In a real implementation, this would query the blockchain API
    // For simulation, we'll return a random balance
    
    return new Response(
      JSON.stringify({
        address: address,
        balance: Math.floor(Math.random() * 10000000), // Random satoshi amount
        txCount: Math.floor(Math.random() * 20)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting balance:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function to generate mock Bitcoin transactions
async function getMockTransactions(address: string, count: number = 5) {
  const transactions = [];
  const currentTime = Date.now();
  
  for (let i = 0; i < count; i++) {
    const isIncoming = Math.random() > 0.5;
    const amount = Math.floor(Math.random() * 1000000) + 10000; // Between 10k and 1M satoshis
    
    transactions.push({
      txid: Array.from({length: 64}, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(''),
      type: isIncoming ? 'received' : 'sent',
      amount: isIncoming ? amount : -amount,
      confirmations: Math.floor(Math.random() * 100) + 1,
      time: new Date(currentTime - (i * 86400000 * Math.random())).toISOString(),
      otherAddress: `tb1q${Array.from({length: 38}, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join('')}`,
    });
  }
  
  return transactions;
}
