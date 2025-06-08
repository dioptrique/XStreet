import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock external market data APIs for Bitcoin price simulation
const MARKET_APIS = {
  coinGecko: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
  binance: "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
  kraken: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD"
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'updatePrices':
        return await handleUpdatePrices(supabase);
      case 'getMarketData':
        return await handleGetMarketData();
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

// Update all product prices based on algorithmic factors
async function handleUpdatePrices(supabase: any) {
  try {
    // Get current Bitcoin market data (in a real app, we would use actual API calls)
    const marketData = await getSimulatedMarketData();

    // Get all products that need pricing updates
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, stock_count');

    if (productsError) throw productsError;

    // Process each product with a price update algorithm
    const updates = [];
    const priceHistoryEntries = [];

    for (const product of products) {
      // Calculate new price based on various factors
      const { newPrice, explanation, changePercent } = calculateDynamicPrice(product, marketData);
      
      // Prepare update for this product
      updates.push({
        id: product.id,
        price: newPrice
      });
      
      // Prepare price history entry
      priceHistoryEntries.push({
        product_id: product.id,
        price: newPrice,
        explanation: explanation
      });
    }
    
    // Execute the batch update of product prices
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .upsert(updates);
        
      if (updateError) throw updateError;
    }
    
    // Add entries to price history
    if (priceHistoryEntries.length > 0) {
      const { error: historyError } = await supabase
        .from('price_history')
        .insert(priceHistoryEntries);
        
      if (historyError) throw historyError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedProducts: updates.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating prices:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Get market data for Bitcoin price and market conditions
async function handleGetMarketData() {
  try {
    const marketData = await getSimulatedMarketData();
    
    return new Response(
      JSON.stringify(marketData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching market data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Calculate a new price for a product based on various real-world factors
function calculateDynamicPrice(product: any, marketData: any) {
  // Base volatility represents how much we allow price to fluctuate (%/100)
  const baseVolatility = 0.05;
  
  // Define product sensitivity to Bitcoin price changes (some products are more sensitive)
  // This could be a property stored with the product in a real application
  const bitcoinSensitivity = Math.random() * 0.4 + 0.3; // Between 0.3 and 0.7
  
  // Factor in Bitcoin's 24hr price movement
  const btcPriceEffect = marketData.bitcoin_24h_change * bitcoinSensitivity;
  
  // Factor in market sentiment (positive/negative)
  const sentimentEffect = marketData.sentiment * 0.02;
  
  // Factor in product stock (lower stock = higher price)
  const stockEffect = product.stock_count < 5 ? 0.03 : 0;
  
  // Factor in random market noise
  const randomNoise = (Math.random() * 2 - 1) * 0.02;
  
  // Calculate total price change as a percentage
  const totalChangePercent = btcPriceEffect + sentimentEffect + stockEffect + randomNoise;
  
  // Apply the change, but cap it to our base volatility range
  const cappedChangePercent = Math.max(
    Math.min(totalChangePercent, baseVolatility),
    -baseVolatility
  );
  
  // Calculate the new price with the percentage change
  const priceChange = Math.round(product.price * cappedChangePercent);
  const newPrice = Math.max(product.price + priceChange, Math.floor(product.price * 0.5));
  
  // Generate a human-readable explanation of the price change
  let explanation;
  if (priceChange > 0) {
    explanation = generatePriceIncreaseExplanation(product, cappedChangePercent, marketData);
  } else if (priceChange < 0) {
    explanation = generatePriceDecreaseExplanation(product, cappedChangePercent, marketData);
  } else {
    explanation = `Price stable at ${newPrice} sats. Market conditions remain consistent.`;
  }
  
  return {
    newPrice,
    explanation,
    changePercent: cappedChangePercent * 100
  };
}

// Generate an explanation for price increases
function generatePriceIncreaseExplanation(product: any, changePercent: number, marketData: any) {
  const changePercentFormatted = Math.abs(changePercent * 100).toFixed(1);
  
  const reasons = [
    `Bitcoin price rising by ${marketData.bitcoin_24h_change.toFixed(1)}% in the last 24 hours`,
    'Increased demand from buyers',
    'Limited stock availability',
    `Positive market sentiment (${marketData.sentiment.toFixed(2)})`,
    'Seasonal demand patterns'
  ];
  
  // Select 1-2 reasons for the price change
  const reasonCount = Math.random() > 0.5 ? 2 : 1;
  const selectedReasons = [];
  
  for (let i = 0; i < reasonCount; i++) {
    const randomIndex = Math.floor(Math.random() * reasons.length);
    selectedReasons.push(reasons[randomIndex]);
    reasons.splice(randomIndex, 1);
    
    if (reasons.length === 0) break;
  }
  
  return `Price increased by ${changePercentFormatted}%. ${selectedReasons.join(' and ')} driving prices up.`;
}

// Generate an explanation for price decreases
function generatePriceDecreaseExplanation(product: any, changePercent: number, marketData: any) {
  const changePercentFormatted = Math.abs(changePercent * 100).toFixed(1);
  
  const reasons = [
    `Bitcoin price falling by ${Math.abs(marketData.bitcoin_24h_change).toFixed(1)}% in the last 24 hours`,
    'Decreased market demand',
    'New competitors entering the market',
    `Market sentiment turning bearish (${marketData.sentiment.toFixed(2)})`,
    'Off-season pricing adjustments'
  ];
  
  // Select 1-2 reasons for the price change
  const reasonCount = Math.random() > 0.5 ? 2 : 1;
  const selectedReasons = [];
  
  for (let i = 0; i < reasonCount; i++) {
    const randomIndex = Math.floor(Math.random() * reasons.length);
    selectedReasons.push(reasons[randomIndex]);
    reasons.splice(randomIndex, 1);
    
    if (reasons.length === 0) break;
  }
  
  return `Price decreased by ${changePercentFormatted}%. ${selectedReasons.join(' and ')} influencing price.`;
}

// Simulate getting real market data without actually calling external APIs
async function getSimulatedMarketData() {
  // Generate a simulated Bitcoin price that's somewhat realistic
  const bitcoinPrice = 35000 + Math.random() * 10000;
  
  // Generate a realistic 24h change percentage (-5% to +5%)
  const bitcoin24hChange = (Math.random() * 10 - 5);
  
  // Generate market sentiment (-1 to +1, where positive is bullish)
  const sentiment = (Math.random() * 2 - 1);
  
  // Generate trading volume with some randomness
  const volume24h = 25000 + Math.random() * 15000;
  
  // Simulate data from multiple exchanges
  const exchangeData = {
    binance: {
      price: bitcoinPrice * (1 + (Math.random() * 0.01 - 0.005)),
      volume: volume24h * (1 + (Math.random() * 0.2 - 0.1))
    },
    kraken: {
      price: bitcoinPrice * (1 + (Math.random() * 0.01 - 0.005)),
      volume: volume24h * (1 + (Math.random() * 0.2 - 0.1))
    },
    coinbase: {
      price: bitcoinPrice * (1 + (Math.random() * 0.01 - 0.005)),
      volume: volume24h * (1 + (Math.random() * 0.2 - 0.1))
    }
  };
  
  // Calculate aggregate metrics
  const aggregateData = {
    bitcoin_price_usd: bitcoinPrice,
    bitcoin_24h_change: bitcoin24hChange,
    bitcoin_satoshi_rate: 100000000, // Constant conversion rate
    market_sentiment: sentiment > 0 ? 'bullish' : 'bearish',
    sentiment: sentiment,
    volume_24h: volume24h,
    liquidity_index: 65 + Math.random() * 20, // 65-85 range
    exchange_data: exchangeData,
    timestamp: new Date().toISOString()
  };
  
  return aggregateData;
}
