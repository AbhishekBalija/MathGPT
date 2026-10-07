# Express instead of Motia for the backend

The backend was built on Motia (0.17 beta). After changes at the company behind it, we did not want a core dependency whose future was uncertain, so we moved to Express 5, the most widely used and stable Node HTTP framework, rather than Hono, which fits Bun and Vercel slightly better but was new to the team. Motia's events became plain functions run after the response, and its state store was dropped.
