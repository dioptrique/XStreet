import { ArrowUp, ArrowDown } from 'lucide-react';

interface PriceIndicatorProps {
  priceInSats: number;
  priceChangePercentage: number;
  size?: 'sm' | 'md' | 'lg';
}

const PriceIndicator = ({ 
  priceInSats, 
  priceChangePercentage, 
  size = 'md' 
}: PriceIndicatorProps) => {
  const isPositive = priceChangePercentage >= 0;
  const absChange = Math.abs(priceChangePercentage);
  
  // No need to divide by 10000 anymore since prices are already in XRP
  const displayPrice = priceInSats;
  
  // Color intensity based on the percentage change
  const getColorIntensity = () => {
    if (absChange < 1) return 'text-price-neutral';
    if (absChange < 3) return isPositive ? 'text-green-400' : 'text-red-400';
    if (absChange < 5) return isPositive ? 'text-green-500' : 'text-red-500';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 20
  }[size];

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }[size];

  const Arrow = isPositive ? ArrowUp : ArrowDown;
  
  return (
    <div className={`flex items-center ${getColorIntensity()} ${isPositive ? 'animate-price-pulse-up' : 'animate-price-pulse-down'}`}>
      <span className={`font-mono font-medium ${textSizeClasses}`}>
        {displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XRP
      </span>
      <div className="flex items-center ml-2">
        <Arrow size={iconSize} className="mr-1" />
        <span className={`${textSizeClasses}`}>{absChange.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default PriceIndicator;
