import { Github, Linkedin, Mail, Heart } from "lucide-react";
import { XIcon } from "@/components/icons/x-icon";

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">🍕</span>
              </div>
              <span className="font-bold text-xl">PizzaHog</span>
            </div>

            <div className="flex items-center space-x-6">
              <a
                href="mailto:remington@voundbrand.com"
                className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/therealremington"
                className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/voundbrand"
                className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                aria-label="GitHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/notcleverhandle"
                className="text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                aria-label="X"
                target="_blank"
                rel="noopener noreferrer"
              >
                <XIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="border-t border-secondary-foreground/20 mt-8 pt-8 text-center">
            <p className="text-secondary-foreground/70 text-sm flex items-center justify-center gap-2">
              Built with <Heart className="h-4 w-4 text-red-500" /> for PostHog • Showcasing
              technical skills through pizza preferences
            </p>
            <p className="text-secondary-foreground/50 text-xs mt-2">
              © 2025 Remington Splettstößer. This is a demo website created for job application
              purposes.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
