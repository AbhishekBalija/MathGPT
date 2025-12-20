import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "katex/dist/katex.min.css";
import App from "./App.tsx";
import GoogleAuthProvider from "./components/GoogleAuthProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleAuthProvider>
      <App />
    </GoogleAuthProvider>
  </StrictMode>
);
