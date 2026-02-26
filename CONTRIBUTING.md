# Contributing to featuredrop

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/featuredrop.git
cd featuredrop

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Typecheck
pnpm typecheck
```

## Making Changes

1. Create a branch from `main`: `git checkout -b feat/my-feature`
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass: `pnpm test`
5. Ensure types are correct: `pnpm typecheck`
6. Commit using [Conventional Commits](https://www.conventionalcommits.org/)

## Commit Format

```
<type>: <description>

[optional body]
```

**Types**: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `chore`

**Examples**:
```bash
feat: add Redis storage adapter
fix: handle null watermark in SSR
docs: add Vue integration example
test: add edge case tests for dismissAll
```

## Pull Requests

- Keep PRs focused on a single change
- Update tests and docs as needed
- Ensure CI passes before requesting review
- Link any related issues

## Code Style

- TypeScript strict mode — no `any` types
- No inline styles in React components
- CSS custom properties for all theming
- Vitest for all tests

## Reporting Issues

- Use the GitHub issue templates
- Include reproduction steps
- Specify your environment (Node version, framework, etc.)
