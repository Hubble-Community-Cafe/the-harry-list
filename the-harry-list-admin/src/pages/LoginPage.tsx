import { useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { Coffee, LogIn, Loader2, Shield, Key, Code } from 'lucide-react';
import { loginRequest } from '../lib/authConfig';
import { setApiCredentials, testCredentials, isDevMode, setDevAuthenticated, isDevAuthenticated, hasEnvCredentials } from '../lib/api';

export function LoginPage() {
  const { instance } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  // In dev mode, allow skipping Microsoft auth
  const effectivelyAuthenticated = isDevMode()
    ? (isDevAuthenticated() || isMsalAuthenticated)
    : isMsalAuthenticated;

  // If env credentials exist, we can skip the API credentials step
  const hasEnvCreds = hasEnvCredentials();

  const [step, setStep] = useState<'microsoft' | 'api'>(effectivelyAuthenticated ? 'api' : 'microsoft');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [apiUsername, setApiUsername] = useState('');
  const [apiPassword, setApiPassword] = useState('');

  // Auto-navigate if authenticated and env credentials exist
  useEffect(() => {
    if (effectivelyAuthenticated && hasEnvCreds) {
      navigate('/');
    }
  }, [effectivelyAuthenticated, hasEnvCreds, navigate]);

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await instance.loginPopup(loginRequest);
      // If env credentials exist, go directly to dashboard
      if (hasEnvCreds) {
        navigate('/');
      } else {
        setStep('api');
      }
    } catch (err) {
      setError('Microsoft login failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevModeLogin = () => {
    setDevAuthenticated(true);
    // If env credentials exist, go directly to dashboard
    if (hasEnvCreds) {
      navigate('/');
    } else {
      setStep('api');
    }
  };

  const handleApiLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const isValid = await testCredentials(apiUsername, apiPassword);
      if (isValid) {
        setApiCredentials(apiUsername, apiPassword);
        navigate('/');
      } else {
        setError('Invalid API credentials. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify credentials. Please try again.');
    } finally {
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-hubble-600 to-meteor-500 mb-4">
              <Coffee className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">The Harry List</h1>
            <p className="text-dark-400 mt-1">Staff Administration Portal</p>
          </div>

          {/* Login Card */}
          <div className="card">
            {step === 'microsoft' ? (
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

                {/* Dev Mode Login - only shown in development */}
                {isDevMode() && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-dark-700" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-dark-900 px-2 text-dark-500">or</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDevModeLogin}
                      className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium transition-colors"
                    >
                      <Code className="w-5 h-5" />
                      Dev Mode Login (Skip Microsoft)
                    </button>

                    <p className="text-xs text-center text-amber-500/70">
                      ⚠️ Development mode only - not available in production
                    </p>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleApiLogin} className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-meteor-500/20 mb-4">
                    <Key className="w-6 h-6 text-meteor-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">API Access</h2>
                  <p className="text-sm text-dark-400 mt-1">
                    Enter your API credentials to continue
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="form-group">
                    <label className="label">Username</label>
                    <input
                      type="text"
                      value={apiUsername}
                      onChange={(e) => setApiUsername(e.target.value)}
                      className="input-field"
                      placeholder="admin"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Password</label>
                    <input
                      type="password"
                      value={apiPassword}
                      onChange={(e) => setApiPassword(e.target.value)}
                      className="input-field"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Continue to Dashboard
                    </>
                  )}
                </button>
              </form>
            )}
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

