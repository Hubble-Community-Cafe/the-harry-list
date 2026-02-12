import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import {
  LayoutDashboard, Calendar, LogOut,
  User, Menu
} from 'lucide-react';
import { useState } from 'react';
import { clearAuth} from '../lib/api';
import { ThemeToggle } from './ThemeToggle';

export function Layout() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = accounts[0];

  const handleLogout = () => {
    clearAuth();
    // In dev mode with dev auth, just navigate to login

    instance.logoutPopup().then(() => {
      navigate('/login');
    });

  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/reservations', icon: Calendar, label: 'Reservations' },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-dark-900 border-r border-dark-800
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 p-6 border-b border-dark-800">
            <img
              src="/logo.svg"
              alt="The Harry List Logo"
              className="w-10 h-10 rounded-xl"
            />
            <div>
              <h1 className="font-title font-bold text-white">The Harry List</h1>
              <p className="text-xs text-dark-400 font-light">Admin Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${isActive 
                        ? 'bg-hubble-500/20 text-hubble-400' 
                        : 'text-dark-400 hover:text-white hover:bg-dark-800'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-dark-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-dark-500 uppercase tracking-wider">Settings</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-800/50">
              <div className="w-8 h-8 rounded-full bg-hubble-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-hubble-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {user?.name || 'Staff'}
                </div>
                <div className="text-xs text-dark-400 truncate">
                  {user?.username || 'Logged in'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 mt-2 rounded-xl text-sm font-medium text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-dark-800 bg-dark-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="w-6 h-6 rounded" />
            <span className="font-semibold text-white">The Harry List</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

