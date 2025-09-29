"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">F</span>
            </div>
            <span className="font-montserrat font-bold text-xl">Find It Be Useful</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#tutorials" className="text-foreground hover:text-primary transition-colors">
              Tutorials
            </a>
            <a href="#community" className="text-foreground hover:text-primary transition-colors">
              Community
            </a>
            <a href="#tools" className="text-foreground hover:text-primary transition-colors">
              Tools
            </a>
            <a href="#pricing" className="text-foreground hover:text-primary transition-colors">
              Pricing
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost">Sign In</Button>
            <Button className="bg-primary hover:bg-primary/90">
              Join Discord
              <Badge variant="secondary" className="ml-2 text-xs">
                Free
              </Badge>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              <a href="#tutorials" className="text-foreground hover:text-primary transition-colors">
                Tutorials
              </a>
              <a href="#community" className="text-foreground hover:text-primary transition-colors">
                Community
              </a>
              <a href="#tools" className="text-foreground hover:text-primary transition-colors">
                Tools
              </a>
              <a href="#pricing" className="text-foreground hover:text-primary transition-colors">
                Pricing
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                <Button variant="ghost" className="justify-start">
                  Sign In
                </Button>
                <Button className="justify-start bg-primary hover:bg-primary/90">
                  Join Discord
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Free
                  </Badge>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
