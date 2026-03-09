import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import './index.css'
import App from './App.tsx'
import { getRecaptchaSiteKey } from './lib/api.ts'

const recaptchaSiteKey = getRecaptchaSiteKey();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {recaptchaSiteKey ? (
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
    ) : (
      <App />
    )}
  </StrictMode>,
)
