
-- Add Bitcoin address field to profiles table
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS bitcoin_address TEXT DEFAULT NULL;

-- Create a table for Bitcoin transactions
CREATE TABLE IF NOT EXISTS public.bitcoin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id),
  shop_id UUID REFERENCES public.seller_shops(id),
  amount INTEGER NOT NULL, -- in satoshis, negative for outgoing
  tx_hash TEXT NOT NULL,
  recipient_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  type TEXT NOT NULL, -- 'purchase', 'deposit', 'withdrawal'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Add RLS policies for bitcoin_transactions
ALTER TABLE public.bitcoin_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users can view own transactions" ON public.bitcoin_transactions
  FOR SELECT USING (auth.uid() = user_id);
  
-- Allow sellers to view transactions for their shops
CREATE POLICY "Sellers can view shop transactions" ON public.bitcoin_transactions
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM public.seller_shops WHERE owner_id = auth.uid()
    )
  );

-- Update seller_shops table to include Bitcoin address
ALTER TABLE IF EXISTS public.seller_shops
ADD COLUMN IF NOT EXISTS public_bitcoin_address TEXT DEFAULT NULL;
