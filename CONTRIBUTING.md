# Contributing to Stay Distance

Thanks for your interest in contributing! This document explains how to get set up, the workflow we follow, and what we expect from pull requests.

By participating in this project you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to contribute

- Report bugs via [issues](https://github.com/doryski/stay-distance/issues/new/choose)
- Suggest features or platform adapters (Airbnb, etc.)
- Improve documentation in `docs/` or `README.md`
- Submit bug fixes and code improvements
- Add/improve tests

## Development setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- A Chromium-based browser (Chrome, Edge, Brave) for manual testing

### Local setup

```bash
git clone https://github.com/doryski/stay-distance.git
cd stay-distance
pnpm install
pnpm build
```

Load `dist/` as an unpacked extension in `chrome://extensions` (Developer mode → Load unpacked).

For HMR during development:

```bash
pnpm dev
```

### Useful scripts

- `pnpm dev` – Vite dev build with watch
- `pnpm build` – typecheck + production build
- `pnpm typecheck` – TypeScript check only
- `pnpm test` – run unit tests (Vitest)
- `pnpm test:watch` – Vitest watch mode
- `pnpm lint` / `pnpm lint:fix` – ESLint
- `pnpm format` / `pnpm format:check` – Prettier

## Project structure

- `src/background/` – service worker / background scripts
- `src/content/` – content scripts injected into supported sites
- `src/platforms/` – per-platform DOM selectors and extractors (one folder per site; see `docs/ADDING_A_PLATFORM.md`)
- `src/core/` – routing, geocoding, cache, domain logic
- `src/popup/`, `src/sidepanel/` – extension UI surfaces
- `src/components/`, `src/lib/` – shared UI/components and utilities
- `tests/` – test suites
- `docs/` – architecture, privacy, branding, and platform-adapter guide

## Adding a new platform

See [`docs/ADDING_A_PLATFORM.md`](./docs/ADDING_A_PLATFORM.md). The architecture is platform-agnostic; adding a new site should be a single adapter file plus tests.

## Pull request process

1. Fork the repository and create your branch from `main`.
2. Make focused, incremental commits with clear messages.
3. Add or update tests for any behavior change.
4. Make sure the following pass locally:
   - `pnpm lint`
   - `pnpm format:check`
   - `pnpm test`
   - `pnpm build`
5. Update documentation (`README.md`, `docs/`) when behavior or setup changes.
6. Open a PR against `main` using the PR template. Describe what/why and link related issues.

## Coding guidelines

- TypeScript strict mode; prefer type inference and generics over explicit types.
- Prefer small, composable, pure functions.
- No secrets, no telemetry, no third-party trackers. Privacy-first is a hard requirement.
- Keep dependencies minimal; justify new ones in the PR.
- Follow existing folder conventions and naming.

## Reporting bugs

Open an issue using the bug report template. Include:

- Browser + version, OS
- Extension version / commit SHA
- Steps to reproduce
- Expected vs actual behavior
- Console output or screenshots if useful

## Security

Please do not open a public issue for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for reporting instructions.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
