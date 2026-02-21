# Contributing to Browser Battle Bench

Thanks for helping improve BBB. This guide covers the local workflow and expectations.

## Prerequisites
- Node.js 20+
- npm 9+

## Install
```bash
npm ci
```

## Development
```bash
npm run dev
```

## Tests
```bash
npm run test:unit
npm run test:ui
```

## Build
```bash
npm run build
```

## Pull Request Checklist
- Tests pass locally (`npm run test:unit` and relevant UI smoke).
- No changes to `plan-job/` files in commits.
- Updated docs/screens as needed.
