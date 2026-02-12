import { useState } from 'react';
import { ReservationForm } from './components/ReservationForm';
import { SuccessMessage } from './components/SuccessMessage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

interface SubmissionResult {
  confirmationNumber: string;
  eventTitle: string;
  contactName: string;
  email: string;
}

function App() {
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  const handleSuccess = (result: SubmissionResult) => {
    setSubmissionResult(result);
    setSubmitted(true);
  };

  const handleNewReservation = () => {
    setSubmitted(false);
    setSubmissionResult(null);
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-hubble-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-meteor-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-hubble-500/10 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="flex-1 relative z-10">
        <div className="container mx-auto px-4 py-12">
          {!submitted ? (
            <>
              {/* Hero Section */}
              <div className="text-center mb-12 animate-fade-in">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-hubble-400 via-hubble-300 to-meteor-400 bg-clip-text text-transparent">
                    Reserve Your Spot at Hubble & Meteor
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-dark-300 max-w-2xl mx-auto">
                  Book your next event at Hubble or Meteor Community Café.
                  Fill out the form below and we'll try to get back to you within 72 hours.
                </p>
              </div>

              {/* Form */}
              <ReservationForm onSuccess={handleSuccess} />
            </>
          ) : (
            <SuccessMessage
              result={submissionResult!}
              onNewReservation={handleNewReservation}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;

