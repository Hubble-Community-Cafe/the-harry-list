import { useEffect, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';
import { loginRequest } from '../lib/authConfig';

export function LoginPage() {
  const { instance } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMsalAuthenticated) {
      navigate('/');
    }
    const handler = () => {
      if (isMsalAuthenticated) {
        navigate('/');
      }
    };
    window.addEventListener('msal:accountChanged', handler);
    return () => window.removeEventListener('msal:accountChanged', handler);
  }, [isMsalAuthenticated, navigate]);

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      setError('Microsoft login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-hubble-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-meteor-600/20 rounded-full blur-3xl" />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/logo.svg"
              alt="The Harry List Logo"
              className="w-16 h-16 mx-auto mb-4 rounded-2xl"
            />
            <h1 className="text-2xl font-title font-bold text-white">The Harry List</h1>
            <p className="text-dark-400 font-light mt-1">Staff Administration Portal</p>
          </div>
          {/* Login Card */}
          <div className="card">
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-hubble-500/20 mb-4">
                  <Shield className="w-6 h-6 text-hubble-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Staff Login</h2>
                <p className="text-sm text-dark-400 mt-1">
                  Sign in with your organization Microsoft account
                </p>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              <button
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white font-medium transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                      <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                      <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                      <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                      <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
                    </svg>
                    Sign in with Microsoft
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Footer */}
          <p className="text-center text-sm text-dark-500 mt-6">
            Authorized staff only. All actions are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
