import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Zap, AlertCircle, TrendingUp, Timer, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PriceHistoryEntry } from '@/services/api';
import { getMarketFactors } from '@/services/priceService';

interface PriceFormulaProps {
  currentPrice: number;
  historyEntry?: PriceHistoryEntry;
  productId: string;
  onChartPointSelected?: (entry: PriceHistoryEntry) => void;
}

// Define the interface for market factors
interface MarketFactors {
  bitcoinPrice: number;
  bitcoinVolatility: number;
  networkDemand: number;
  marketSentiment: number;
  seasonalFactor: number;
  inventoryLevel: number;
  promotionActive: boolean;
}

interface PriceComponents {
  basePrice: number;
  lightningDemand: number;
  inventoryFactor: number;
  timeEvent: number;
  loyaltyDiscount: number;
}

const PriceFormula: React.FC<PriceFormulaProps> = ({ 
  currentPrice, 
  historyEntry, 
  productId,
  onChartPointSelected
}) => {
  // State for market factors
  const [marketFactors, setMarketFactors] = useState<MarketFactors>({
    bitcoinPrice: 30000,
    bitcoinVolatility: 0.3,
    networkDemand: 0.5,
    marketSentiment: 0,
    seasonalFactor: 1.0,
    inventoryLevel: 50,
    promotionActive: false
  });
  
  // Fetch market factors on component mount
  useEffect(() => {
    const fetchFactors = async () => {
      const factors = await getMarketFactors();
      if (factors) {
        setMarketFactors(factors);
      }
    };
    
    fetchFactors();
  }, []);
  
  // Calculate price components based on market factors
  const calculateComponents = (): PriceComponents => {
    // Scale down the current price
    const scaledPrice = currentPrice;
    
    // Base price components in satoshis
    const basePrice = Math.floor(scaledPrice * 0.7); // 70% of current price as base
    
    // Use market factors to calculate price components
    const lightningDemand = Math.floor(
      basePrice * 0.35 * marketFactors.networkDemand
    );
    
    const inventoryLevel = marketFactors.inventoryLevel / 100;
    const inventoryFactor = Math.floor(
      basePrice * 0.25 * (1 - inventoryLevel)
    );
    
    const timeEvent = Math.floor(
      basePrice * 0.15 * (marketFactors.seasonalFactor - 0.8) / 0.4
    );
    
    const loyaltyDiscount = marketFactors.promotionActive ? 
      Math.floor(basePrice * 0.05) : 
      Math.floor(basePrice * 0.02);
    
    // Use the explanation to choose which component to emphasize
    const explanation = historyEntry?.explanation || '';
    let adjustedLightningDemand = lightningDemand;
    let adjustedInventoryFactor = inventoryFactor;
    let adjustedTimeEvent = timeEvent;
    
    // Emphasize different factors based on the explanation
    if (explanation.includes("demand") || explanation.includes("Lightning")) {
      adjustedLightningDemand += 300;
    } else if (explanation.includes("inventory") || explanation.includes("supply")) {
      adjustedInventoryFactor += 300;
    } else if (explanation.includes("event") || explanation.includes("season")) {
      adjustedTimeEvent += 300;
    }
    
    // Ensure total adds up to current price
    const calculated = basePrice + adjustedLightningDemand + adjustedInventoryFactor + adjustedTimeEvent - loyaltyDiscount;
    const diff = scaledPrice - calculated;
    adjustedLightningDemand += diff;
    
    return {
      basePrice: basePrice , // Scale back up for storage
      lightningDemand: adjustedLightningDemand ,
      inventoryFactor: adjustedInventoryFactor,
      timeEvent: adjustedTimeEvent,
      loyaltyDiscount: loyaltyDiscount
    };
  };
  
  const [components, setComponents] = useState<PriceComponents>(calculateComponents());
  
  // Update components when price, history entry, or market factors change
  useEffect(() => {
    setComponents(calculateComponents());
  }, [currentPrice, historyEntry, marketFactors]);
  
  // Calculate the real coefficients based on market factors
  const getCoefficients = () => {
    return {
      alpha: (0.25 + marketFactors.networkDemand * 0.2).toFixed(2),
      beta: (0.15 + (1 - marketFactors.inventoryLevel / 100) * 0.2).toFixed(2),
      gamma: (0.10 + (marketFactors.seasonalFactor - 0.8) / 0.4 * 0.1).toFixed(2),
      delta: marketFactors.promotionActive ? '0.08' : '0.03'
    };
  };
  
  const coefficients = getCoefficients();
  
  // Animated values
  const animatedBase = useSpring({
    number: components.basePrice,
    from: { number: 0 },
    config: { tension: 80, friction: 14 }
  });
  
  const animatedLightning = useSpring({
    number: components.lightningDemand,
    from: { number: 0 },
    config: { tension: 80, friction: 14 }
  });
  
  const animatedInventory = useSpring({
    number: components.inventoryFactor,
    from: { number: 0 },
    config: { tension: 80, friction: 14 }
  });
  
  const animatedTimeEvent = useSpring({
    number: components.timeEvent,
    from: { number: 0 },
    config: { tension: 80, friction: 14 }
  });
  
  const animatedDiscount = useSpring({
    number: components.loyaltyDiscount,
    from: { number: 0 },
    config: { tension: 80, friction: 14 }
  });
  
  const animatedTotal = useSpring({
    number: currentPrice,
    from: { number: 0 },
    config: { tension: 80, friction: 14 }
  });

  return (
    <TooltipProvider>
      <div className="bg-satstreet-medium p-5 rounded-lg border border-satstreet-light">
        <h3 className="font-semibold mb-4 text-lg flex items-center">
          <span className="mr-2">Pricing Logic</span>
          <HoverCard>
            <HoverCardTrigger asChild>
              <span className="cursor-help">
                <AlertCircle size={16} className="text-muted-foreground" />
              </span>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 bg-satstreet-dark border-satstreet-light">
              <div className="text-sm">
                <p className="font-medium mb-2">How This Price Is Calculated</p>
                <p className="text-muted-foreground">
                  This breakdown shows you how the current price is determined based on 
                  market factors like XRP price (${marketFactors.bitcoinPrice.toLocaleString()}), 
                  network demand, inventory levels, and special promotions.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </h3>
        
        <div className="font-mono text-base md:text-lg space-y-3">
          {/* Full Formula */}
          <div className="mb-4 font-medium text-center hidden md:block">
            P = B + α(DLN) + β(Sinv) + γ(Tevent) - δ(Ldiscount)
          </div>
          
          {/* Calculated Formula with Values */}
          <div className="flex flex-wrap items-center gap-y-2">
            <div className="font-medium mr-2 text-bitcoin">Price =</div>
            
            {/* Base Price */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="px-2 py-1 mr-1 rounded-md bg-satstreet-dark border border-satstreet-light inline-flex items-center">
                  <animated.div>
                    {animatedBase.number.to(n => Math.floor(n).toLocaleString())}
                  </animated.div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-satstreet-dark border-satstreet-light">
                <p>Base price (starting value)</p>
              </TooltipContent>
            </Tooltip>
            
            <div className="mr-1">+</div>
            
            {/* Lightning Demand */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group relative">
                  <Link 
                    to={`/lightning/${productId}`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="px-2 py-1 mr-1 rounded-md bg-satstreet-dark border border-bitcoin/30 inline-flex items-center hover:border-bitcoin transition-colors"
                  >
                    <span className="mr-1 text-xs text-bitcoin">{coefficients.alpha}</span>
                    <span className="mr-1">(</span>
                    <animated.div>
                      {animatedLightning.number.to(n => Math.floor(n).toLocaleString())}
                    </animated.div>
                    <span className="ml-1">)</span>
                    <Zap size={12} className="ml-1 text-bitcoin" />
                  </Link>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-satstreet-dark border-satstreet-light">
                <div className="space-y-2">
                  <p>Market demand from XRPL activity</p>
                  <p>Current network demand: {Math.round(marketFactors.networkDemand * 100)}%</p>
                  <p className="text-xs text-muted-foreground">Click to view transactions in new tab</p>
                </div>
              </TooltipContent>
            </Tooltip>
            
            <div className="mr-1">+</div>
            
            {/* Inventory */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="px-2 py-1 mr-1 rounded-md bg-satstreet-dark border border-blue-500/30 inline-flex items-center">
                  <span className="mr-1 text-xs text-blue-400">{coefficients.beta}</span>
                  <span className="mr-1">(</span>
                  <animated.div>
                    {animatedInventory.number.to(n => Math.floor(n).toLocaleString())}
                  </animated.div>
                  <span className="ml-1">)</span>
                  <TrendingUp size={12} className="ml-1 text-blue-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-satstreet-dark border-satstreet-light">
                <div>
                  <p>Supply adjustment based on current inventory levels</p>
                  <p>Current inventory: {marketFactors.inventoryLevel}%</p>
                </div>
              </TooltipContent>
            </Tooltip>
            
            <div className="mr-1">+</div>
            
            {/* Time Event */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="px-2 py-1 mr-1 rounded-md bg-satstreet-dark border border-purple-500/30 inline-flex items-center">
                  <span className="mr-1 text-xs text-purple-400">{coefficients.gamma}</span>
                  <span className="mr-1">(</span>
                  <animated.div>
                    {animatedTimeEvent.number.to(n => Math.floor(n).toLocaleString())}
                  </animated.div>
                  <span className="ml-1">)</span>
                  <Timer size={12} className="ml-1 text-purple-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-satstreet-dark border-satstreet-light">
                <div>
                  <p>Seasonal factors and special events that affect pricing</p>
                  <p>Seasonal factor: {marketFactors.seasonalFactor.toFixed(2)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
            
            <div className="mr-1">-</div>
            
            {/* Loyalty Discount */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="px-2 py-1 mr-1 rounded-md bg-satstreet-dark border border-red-500/30 inline-flex items-center">
                  <span className="mr-1 text-xs text-red-400">{coefficients.delta}</span>
                  <span className="mr-1">(</span>
                  <animated.div>
                    {animatedDiscount.number.to(n => Math.floor(n).toLocaleString())}
                  </animated.div>
                  <span className="ml-1">)</span>
                  <Heart size={12} className="ml-1 text-red-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-satstreet-dark border-satstreet-light">
                <div>
                  <p>Available discounts and promotional offers</p>
                  <p>{marketFactors.promotionActive ? 'Promotion active!' : 'No active promotions'}</p>
                </div>
              </TooltipContent>
            </Tooltip>
            
            <div className="ml-2 mr-2">=</div>
            
            {/* Final Price */}
            <div className="px-3 py-1 rounded-md bg-bitcoin/20 border border-bitcoin font-bold inline-flex items-center">
              <animated.div>
                {animatedTotal.number.to(n => (Math.floor(n)).toLocaleString())}
              </animated.div>
              <span className="ml-1">XRP</span>
            </div>
          </div>
        </div>
        
        {/* Bitcoin Price Info */}
        <div className="mt-3 p-2 bg-satstreet-dark/50 rounded text-xs">
          <span className="font-medium">XRP Price:</span> 
          <span className="text-bitcoin ml-1">${marketFactors.bitcoinPrice.toLocaleString()} USD</span>
        </div>
        
        {/* Explanation */}
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            {historyEntry?.explanation || 
             `Current price is determined by Bitcoin price ($${marketFactors.bitcoinPrice.toLocaleString()}), network demand (${Math.round(marketFactors.networkDemand * 100)}%), and inventory levels.`}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PriceFormula;
