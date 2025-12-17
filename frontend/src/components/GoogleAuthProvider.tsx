import { GoogleOAuthProvider } from "@react-oauth/google";
import type { ReactNode } from "react";

interface GoogleAuthProviderWrapperProps {
  children: ReactNode;
}

const GoogleAuthProviderWrapper = ({
  children,
}: GoogleAuthProviderWrapperProps) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.warn(
      "VITE_GOOGLE_CLIENT_ID is not set. Google OAuth will not work."
    );
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
  );
};

export default GoogleAuthProviderWrapper;
