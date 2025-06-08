import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";
import LightningTransactions from "./pages/LightningTransactions";
import Orders from './pages/Orders';

function App() {
  return (
    <>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Existing routes */}
            <Route path="/" element={<Index />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/wallet" element={<Wallet />} />
            
            {/* New route for Lightning transactions */}
            <Route path="/lightning/:productId" element={<LightningTransactions />} />
            
            {/* New route for Orders */}
            <Route path="/orders" element={<Orders />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
      <Toaster />
    </>
  );
}

export default App;
