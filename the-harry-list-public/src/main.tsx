import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import './index.css'
import App from './App.tsx'
import { getRecaptchaSiteKey } from './lib/api.ts'

const recaptchaSiteKey = getRecaptchaSiteKey();

const AppWithRecaptcha = () => {
  // If no reCAPTCHA key is configured, render without provider
  if (!recaptchaSiteKey) {
    return <App />;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaSiteKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
      }}
    >
      <App />
    </GoogleReCaptchaProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithRecaptcha />
  </StrictMode>,
)
