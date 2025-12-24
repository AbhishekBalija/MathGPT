# Contributing to NeoMath

## Getting Started

1. Fork the repository
2. Clone your fork
3. Follow [setup.md](./setup.md) to configure local development

---

## Branch Naming

```
feature/description    - New features
fix/description        - Bug fixes
docs/description       - Documentation
refactor/description   - Code refactoring
admin/description      - Admin dashboard features
```

---

## Commit Messages

Follow conventional commits:

```
feat: add step explanation toggle
fix: resolve auth token refresh loop
docs: update API reference
refactor: extract solution parser
admin: add user management page
```

---

## Pull Request Process

1. Create feature branch from `main`
2. Make changes and test locally
3. Run tests: `npm run test`
4. Commit with descriptive messages
5. Push to your fork
6. Open PR to `main`
7. Address review feedback
8. Squash and merge when approved

---

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use explicit return types for functions
- Use interfaces for object shapes

### React

- Functional components only
- Use hooks for state management
- Keep components focused and small
- Extract reusable logic to custom hooks

### Naming Conventions

- **Components**: PascalCase (`ChatWindow.tsx`)
- **Functions**: camelCase (`solveProblem`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Files**: kebab-case for non-components (`auth.service.ts`)

---

## Project Structure

When adding new features:

### Frontend

- **Components** → `frontend/src/components/`
- **Pages** → `frontend/src/pages/`
- **Admin Pages** → `frontend/src/pages/Admin/`
- **API Services** → `frontend/src/services/`
- **Stores** → `frontend/src/stores/`
- **Types** → `frontend/src/types/`

### Backend

- **API Endpoints** → `backend/src/api/`
- **Admin Endpoints** → `backend/src/api/admin/`
- **Auth Endpoints** → `backend/src/api/auth/`
- **Business Logic** → `backend/src/services/`
- **Database Access** → `backend/src/repositories/`
- **Middleware** → `backend/src/middlewares/`

---

## Testing

### Frontend Tests

```bash
cd frontend
npm run test
```

### Backend Tests

```bash
cd backend
npm run test
```

---

## API Documentation

When adding or modifying API endpoints:

1. Update `docs/api-reference.md` with endpoint details
2. Include request/response examples
3. Document any new error codes
4. Update `docs/architecture.md` if adding new services

---

## Questions?

Open an issue for discussion before major changes.

---

_Last updated: December 22, 2025_
