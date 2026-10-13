import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import ReactGA from "react-ga4";
import "./index.css";
import "katex/dist/katex.min.css";
import App from "./App.tsx";
import GoogleAuthProvider from "./components/GoogleAuthProvider.tsx";

// Initialize Google Analytics
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== "PLACEHOLDER") {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

// Initialize Sentry. Some students are children, so send no personal data
// (no IP address) and record a replay only when an error happens.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN && SENTRY_DSN !== "PLACEHOLDER") {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      // Hide all text and images in replays
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    // Tracing: a sample is enough to spot slow pages
    tracesSampleRate: 0.1,
    // Session Replay: never for normal visits, always for a visit with an error
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleAuthProvider>
      <Sentry.ErrorBoundary
        fallback={
          <div className="p-4 text-red-500">
            An error has occurred. Please refresh the page.
          </div>
        }
      >
        <App />
      </Sentry.ErrorBoundary>
    </GoogleAuthProvider>
  </StrictMode>
);
