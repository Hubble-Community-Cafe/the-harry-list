import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicClientApplication, EventType, type AccountInfo } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { BrowserRouter } from 'react-router-dom';
import { msalConfig } from './lib/authConfig';
import { setMsalInstance } from './lib/api';
import App from './App';
import './index.css';

const msalInstance = new PublicClientApplication(msalConfig);

// Set MSAL instance for API module to use for token acquisition
setMsalInstance(msalInstance);

// Initialize MSAL before rendering
msalInstance.initialize().then(async () => {
  // Handle redirect response (for redirect-based login)
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      console.log('Login successful via redirect:', response.account?.username);
      msalInstance.setActiveAccount(response.account);
      // Force context update by dispatching a custom event
      window.dispatchEvent(new Event('msal:accountChanged'));
    } else {
      // Set active account if one exists
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        console.log('Active account restored:', accounts[0].username);
        window.dispatchEvent(new Event('msal:accountChanged'));
      }
    }
  } catch (error) {
    console.error('Error handling redirect:', error);
  }

  // Listen for login events
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as { account: AccountInfo | null };
      msalInstance.setActiveAccount(payload.account);
      console.log('Login event - account set:', payload.account?.username);
      window.dispatchEvent(new Event('msal:accountChanged'));
    }
    if (event.eventType === EventType.LOGOUT_SUCCESS) {
      msalInstance.setActiveAccount(null);
      console.log('Logout successful');
    }
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </StrictMode>
  );
}).catch((error) => {
  console.error('MSAL initialization error:', error);
});
