import { Sparkles } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="relative z-20 border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="The Harry List Logo"
              className="w-10 h-10 rounded-xl"
            />
            <div>
              <h1 className="text-lg md:text-xl font-title font-bold text-white">
                The Harry List
              </h1>
              <p className="text-xs text-dark-400 font-light hidden sm:block">
                Event Reservations
              </p>
            </div>
          </div>

          {/* Right side: Theme toggle and navigation hint */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2 text-sm text-dark-400">
              <Sparkles className="w-4 h-4 text-hubble-400" />
              <span className="hidden sm:inline">Hubble & Meteor Community Cafés</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

