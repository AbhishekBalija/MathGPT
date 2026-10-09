import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import ReactGA from "react-ga4";
import "./index.css";
import "katex/dist/katex.min.css";
import App from "./App.tsx";
import GoogleAuthProvider from "./components/GoogleAuthProvider.tsx";
import { useThemeStore } from "./stores/themeStore";

// Apply the saved (or system) theme before the first paint, on every page.
// It used to run only inside the Navbar and Sidebar, so pages without them
// (sign-in, sign-up) always opened in light mode.
useThemeStore.getState().initTheme();

// Initialize Google Analytics
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== "PLACEHOLDER") {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

// Initialize Sentry
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN && SENTRY_DSN !== "PLACEHOLDER") {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
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
  </StrictMode>,
);
