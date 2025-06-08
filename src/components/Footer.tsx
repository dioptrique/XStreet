import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-satstreet-medium border-t border-satstreet-light mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex flex-col items-center md:items-start mb-4">
              <img 
                src="/xrp-logo.svg" 
                alt="xStreet" 
                className="h-10 w-auto mb-3"
              />
              <span className="text-xl font-bold">
                <span className="text-white">x</span>
                <span className="text-[#00C3FF]">Street</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
            The premier marketplace for XRP enthusiasts, where all transactions happen in XRP,
            and prices are determined by transparent market forces.            </p>
          </div>
          
          <div>
            <h3 className="font-bold mb-4 text-bitcoin">Learn</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-bitcoin transition-colors">
                What is XRP?
                </Link>
              </li>
              <li>
                <Link to="/" className="text-muted-foreground hover:text-bitcoin transition-colors">
                  How pricing works
                </Link>
              </li>
              <li>
                <Link to="/" className="text-muted-foreground hover:text-bitcoin transition-colors">
                  Setting up a wallet
                </Link>
              </li>
              <li>
                <Link to="/" className="text-muted-foreground hover:text-bitcoin transition-colors">
                XRP Basics
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-4 text-bitcoin">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-bitcoin transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/" className="text-muted-foreground hover:text-bitcoin transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/" className="text-muted-foreground hover:text-bitcoin transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/" className="text-muted-foreground hover:text-bitcoin transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t border-satstreet-light text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} xStreet. All rights reserved.</p>
          <p className="mt-1">Powered by XRP.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
