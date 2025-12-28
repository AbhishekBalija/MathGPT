// Sentry is disabled for Motia Cloud deployment
// Motia Cloud uses its own observability plugin (@motiadev/plugin-observability)
// To re-enable Sentry for local development, you can conditionally import it

export async function initSentry() {
  // Sentry disabled - using Motia Cloud's native observability instead
  // The @motiadev/plugin-observability handles logging and monitoring
  console.log("📊 Using Motia Cloud observability (Sentry disabled)");
  return null;
}
