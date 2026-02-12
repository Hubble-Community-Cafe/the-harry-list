import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { BrowserRouter } from 'react-router-dom';
import { msalConfig } from './lib/authConfig';
import App from './App';
import './index.css';

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL before rendering
msalInstance.initialize().then(async () => {
  // Handle redirect response (for redirect-based login)
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      console.log('Login successful via redirect:', response.account?.username);
      msalInstance.setActiveAccount(response.account);
    } else {
      // Set active account if one exists
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        console.log('Active account restored:', accounts[0].username);
      }
    }
  } catch (error) {
    console.error('Error handling redirect:', error);
  }

  // Listen for login events
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as { account: any };
      msalInstance.setActiveAccount(payload.account);
      console.log('Login event - account set:', payload.account?.username);
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

