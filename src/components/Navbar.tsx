import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import SearchBar from './SearchBar';
import { 
  ShoppingCart, 
  User,
  Menu,
  X 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleSearch = (query: string) => {
    navigate(`/?search=${encodeURIComponent(query)}`);
    setMobileMenuOpen(false);
  };
  
  const navToWallet = () => {
    navigate('/wallet');
    setMobileMenuOpen(false);
  };

  const navToCart = () => {
    navigate('/cart');
    setMobileMenuOpen(false);
  };
  
  const navToLogin = () => {
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const navToHome = () => {
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-satstreet-dark py-4 px-4 md:px-8 border-b border-satstreet-medium">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo - always visible */}
        <Link to="/" className="flex items-center">
          <div className="bg-satstreet-dark rounded-full p-1 flex items-center justify-center">
            <img 
              src="/xrp-logo.svg" 
              alt="xStreet" 
              className="h-12 w-auto mr-3"
            />
          </div>
          <span className="text-xl font-bold">
            <span className="text-white">x</span>
            <span className="text-[#00C3FF]">Street</span>
          </span>
        </Link>


        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6 flex-grow justify-end">
          <div className="flex-grow max-w-md">
            <SearchBar onSearch={handleSearch} />
          </div>
          
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={navToWallet}
                className="text-sm border-bitcoin/30 hover:border-bitcoin hover:bg-satstreet-light"
              >
                <span className="font-mono">{user?.walletBalance.toLocaleString()} XRP</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <User />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-satstreet-medium border-satstreet-light">
                  <DropdownMenuLabel className="text-center">{user?.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-satstreet-light" />
                  <DropdownMenuItem onClick={navToWallet}>My Wallet</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                onClick={navToCart} 
                size="icon" 
                variant="ghost" 
                className="relative"
              >
                <ShoppingCart />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-bitcoin text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Button 
                onClick={navToLogin} 
                variant="default"
                className="bg-bitcoin hover:bg-bitcoin-dark"
              >
                Login
              </Button>
              <Button 
                onClick={navToCart} 
                size="icon" 
                variant="ghost" 
                className="relative"
              >
                <ShoppingCart />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-bitcoin text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          {/* Cart icon always visible on mobile */}
          <Button 
            onClick={navToCart}
            size="icon" 
            variant="ghost"
            className="relative mr-2"
          >
            <ShoppingCart />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-bitcoin text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-satstreet-light">
          <div className="px-4 py-2">
            <SearchBar onSearch={handleSearch} />
          </div>
          
          {isAuthenticated ? (
            <div className="flex flex-col space-y-2 px-4 py-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={navToWallet}
                className="justify-start"
              >
                <span className="font-mono mr-2">{user?.walletBalance.toLocaleString()} XRP</span>
                My Wallet
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="justify-start"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="px-4 py-2">
              <Button 
                onClick={navToLogin} 
                variant="default" 
                className="w-full bg-bitcoin hover:bg-bitcoin-dark"
              >
                Login
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
