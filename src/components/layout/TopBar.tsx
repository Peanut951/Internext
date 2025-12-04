import { Phone, Mail, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TopBar = () => {
  return (
    <div className="bg-primary text-primary-foreground py-2">
      <div className="container-wide flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <a href="tel:1300123456" className="flex items-center gap-2 hover:text-accent transition-colors">
            <Phone className="h-4 w-4" />
            <span>1300 567 835</span>
          </a>
          <a href="mailto:sales@internext.com.au" className="flex items-center gap-2 hover:text-accent transition-colors">
            <Mail className="h-4 w-4" />
            <span>orders@internext.com.au</span>
          </a>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-primary-foreground/70 hidden sm:inline">Reseller Portal</span>
          <Link to="/login">
            <Button variant="accent" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
