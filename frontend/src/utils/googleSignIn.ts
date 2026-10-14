/**
 * True when Google sign-in is set up. Without a client id the Google button
 * throws, so pages must not draw it (local development often has no id).
 */
export function isGoogleSignInEnabled(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}
