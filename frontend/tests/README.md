# Frontend Test Suite Documentation

## Overview

The brutal test suite (`tests/brutal.test.ts`) tests XSS prevention, state management, authentication security, network failure handling, and performance.

## Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Test Categories

### 🛡️ XSS Prevention

- Script tag sanitization (uses DOMPurify)
- HTML escape in LaTeX fallbacks
- DOM clobbering prevention
- URL parameter injection

### 🔄 State Management Chaos

- Race condition handling
- Concurrent message additions
- Memory leak prevention
- Delete during loading

### 🔐 Auth State Security

- Token clearing on logout
- Session storage protection
- Token refresh race conditions

### 🌐 Network Failure Handling

- Network timeout handling
- Server 500 error handling
- Malformed JSON response
- Connection reset handling
- Offline detection

### 📐 LaTeX Rendering Edge Cases

- Malformed LaTeX handling
- Recursive/nested macros
- Extremely long expressions

### ♿ Accessibility & Focus

- Focus hijacking prevention
- ARIA attribute escaping

### ⚡ Performance Stress

- 100 solution steps rendering
- 1000 chat history items

## Security Dependencies

- **DOMPurify** - XSS sanitization for all `dangerouslySetInnerHTML` usage
- **KaTeX** - Math rendering with `throwOnError: false`

## Test Configuration

Configured in `vitest.config.ts`:

| Setting       | Value   | Purpose                           |
| ------------- | ------- | --------------------------------- |
| `environment` | jsdom   | Browser-like testing              |
| `testTimeout` | 30000ms | Async operation tests             |
| `globals`     | true    | No imports for describe/it/expect |

## Sanitization Utility

All HTML rendering uses `src/utils/sanitize.ts`:

```typescript
import { sanitizeHtml, escapeHtml } from "../utils/sanitize";

// Safe rendering
dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
```
