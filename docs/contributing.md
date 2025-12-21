# Contributing to MathGPT

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
```

---

## Commit Messages

Follow conventional commits:

```
feat: add step explanation toggle
fix: resolve auth token refresh loop
docs: update API reference
refactor: extract solution parser
```

---

## Pull Request Process

1. Create feature branch from `main`
2. Make changes and test locally
3. Commit with descriptive messages
4. Push to your fork
5. Open PR to `main`
6. Address review feedback
7. Squash and merge when approved

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

- **Frontend components** → `frontend/src/components/`
- **Frontend pages** → `frontend/src/pages/`
- **API services** → `frontend/src/services/`
- **Backend endpoints** → `backend/src/api/`
- **Business logic** → `backend/src/services/`
- **Database access** → `backend/src/repositories/`

---

## Testing (Future)

When tests are added:

```bash
# Frontend
cd frontend
npm run test

# Backend
cd backend
npm run test
```

---

## Questions?

Open an issue for discussion before major changes.
