# Backend organised by feature modules

The backend is grouped by feature (auth, solve, solutions, users, analytics, admin, ai, email), each owning its routes, logic, data access and validation, instead of by technical layer (all routes together, all services together). Within a module, only repositories import the database client, and authentication is applied as Express middleware rather than checked inside each route. This keeps a feature's code in one place and removes the copy-pasted auth and database-connection code the layered layout had grown.
