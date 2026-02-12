import { ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative z-20 border-t border-dark-800/50 bg-dark-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a
              href="https://hubble.cafe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-dark-400 hover:text-hubble-400 transition-colors"
            >
              Hubble Café
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://meteorcommunity.cafe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-dark-400 hover:text-meteor-400 transition-colors"
            >
              Meteor Community Café
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Made with love */}
          <div className="flex items-center gap-1 text-sm text-dark-500">
            Made by Pim van Leeuwen
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-dark-800/50 text-center text-xs text-dark-600">
          © {new Date().getFullYear()} Hubble & Meteor Community Cafés. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

