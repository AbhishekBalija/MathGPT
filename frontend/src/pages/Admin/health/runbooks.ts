import type { HealthServiceId } from "../../../services/admin.service";

// Each service's name, what it is, and what to do when it is down
export const SERVICES: Record<HealthServiceId, { name: string; what: string; runbook: string }> = {
  api: {
    name: "API",
    what: "neomath-api",
    runbook: "Check the neomath-api logs in Vercel. If it broke right after a merge, roll back to the last deploy.",
  },
  database: {
    name: "Database",
    what: "Neon production",
    runbook: "Check Neon's status page. Students see a friendly error until it is back.",
  },
  gemini: {
    name: "Gemini",
    what: "gemini-2.5-flash",
    runbook: "Usually the free-tier limit. Solves fall back to the backup model, and the limit resets at 12:30 India time.",
  },
  backup: {
    name: "Backup model",
    what: "OpenRouter",
    runbook: "If both models fail, students see an error. Check the OpenRouter key in Vercel.",
  },
  email: {
    name: "Email",
    what: "Resend",
    runbook: "Sign-up codes can't be sent. Check the Resend dashboard and that the domain is still verified.",
  },
  turnstile: {
    name: "Robot check",
    what: "Cloudflare Turnstile",
    runbook: "Sign-ups fail. Check that the site key and secret key match in Vercel.",
  },
  sentry: {
    name: "Error tracking",
    what: "Sentry",
    runbook: "Nothing breaks for students, but errors are not reported. Check SENTRY_DSN in Vercel.",
  },
};
