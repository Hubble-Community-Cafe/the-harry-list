import { Suspense, useEffect, useState } from 'react';
import { ReservationForm } from './components/ReservationForm';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ThemeProvider, SkipLink, MAIN_CONTENT_ID, ErrorBoundary } from 'the-harry-list-shared';
import { PrivacyPolicy, SuccessMessage, prefetchDeferredChunks } from './lib/deferredChunks';
import { REPLY_TIME } from './lib/replyTime';

interface SubmissionResult {
  confirmationNumber: string;
  eventTitle: string;
  contactName: string;
  email: string;
}

function App() {
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  // The privacy dialog is loaded on demand: mount it on first open, then keep it mounted so it
  // closes and reopens exactly as before.
  const [privacyMounted, setPrivacyMounted] = useState(false);
  const openPrivacy = () => {
    setPrivacyMounted(true);
    setShowPrivacy(true);
  };

  useEffect(() => {
    prefetchDeferredChunks();
  }, []);

  const handleSuccess = (result: SubmissionResult) => {
    setSubmissionResult(result);
    setSubmitted(true);
  };

  const handleNewReservation = () => {
    setSubmitted(false);
    setSubmissionResult(null);
  };

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <div className="min-h-screen bg-dark-950 flex flex-col">
        <SkipLink />
        <Header />

        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 relative z-10 outline-none">
          <div className="container mx-auto px-4 py-12">
            {!submitted ? (
            <>
              {/* Hero Section */}
              <div className="text-center mb-12 animate-fade-in">
                {/* Two-tone, flat: each café in its own colour (housestyle), no gradient text. */}
                <h1 className="font-title text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight leading-tight text-white">
                  Reserve Your Spot at <span className="text-hubble-400">Hubble</span> &amp;{' '}
                  <span className="text-meteor-400">Meteor</span>
                </h1>
                <p className="text-lg md:text-xl text-dark-300 max-w-2xl mx-auto">
                  Book your next event at Hubble or Meteor Community Café.
                  Fill out the form below. {REPLY_TIME}
                </p>
              </div>

              {/* Form */}
              <ReservationForm onSuccess={handleSuccess} onOpenPrivacy={openPrivacy} />
            </>
          ) : (
            <Suspense fallback={null}>
              <SuccessMessage
                result={submissionResult!}
                onNewReservation={handleNewReservation}
              />
            </Suspense>
          )}
        </div>
      </main>

      <Footer onOpenPrivacy={openPrivacy} />
      {privacyMounted && (
        <Suspense fallback={null}>
          <PrivacyPolicy open={showPrivacy} onClose={() => setShowPrivacy(false)} />
        </Suspense>
      )}
    </div>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

