# Test safety and conventions

## Commands

- `pnpm test` runs the complete unit/integration suite once.
- `pnpm test:watch` runs Vitest in watch mode.
- `pnpm test:unit` runs fast unit tests.
- `pnpm test:integration` runs database/API integration tests.
- `pnpm test:coverage` writes coverage artifacts to `coverage/`.

## Database safety

Tests default to `mongodb://127.0.0.1:27017/foysalahmedmin_test`.
Integration environments can provide `TEST_DATABASE_URL`, but the database name
must contain a standalone `test` segment such as `portfolio_test` or
`test_portfolio`. Cleanup helpers reject any other database name.

`TEST_TRANSACTION_MODE=compensation` is the safe local default for testing
provider/database compensation without assuming transaction support. Use
`TEST_TRANSACTION_MODE=replica-set` with a `mongodb+srv` URL or a URL containing
an explicit `replicaSet` query parameter for transaction integration suites.
CI environments that run transaction-sensitive domains must execute both modes.
Use `runInTestTransactionMode` in boundary tests so the same scenario has an
explicit transaction executor and a provider/database compensation executor.

Never point test commands at production or staging databases/storage. Provider
calls must be mocked unless a separately isolated provider test is explicitly
configured.

## Test placement

- `tests/unit`: pure domain/configuration tests.
- `tests/integration`: database, route, and service boundaries.
- `tests/components`: synchronous React/UI behavior; add
  `// @vitest-environment jsdom` to component test files.

Async Server Components are covered through browser E2E tests in the later
quality-automation milestone.
