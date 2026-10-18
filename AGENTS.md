# AGENTS.md

Instructions for coding agents working in this repository. Humans should read
[CONTRIBUTING.md](CONTRIBUTING.md) as well.

## What this is

`nhl-api-ts` is a TypeScript SDK **and** CLI for the public, unauthenticated
NHL web API (`api-web.nhle.com`) and stats API (`api.nhle.com/stats/rest`).
It has no runtime dependencies. It runs on Node.js >= 24 and ships as ESM only.
It is a port of [nhl-api-py](https://github.com/coreyjs/nhl-api-py).

The package is **not yet published with a major version**, so breaking changes are allowed. Prefer
idiomatic TypeScript over parity with the Python original.

The repository is a pnpm workspace:

- `packages/nhl-api-ts`: the SDK and CLI, published to npm as `nhl-api-ts`
  (unscoped). Paths in this file are relative to this package unless noted.
- `packages/api-types-infer`: private (never published) tooling that infers
  the response types from live responses, writes the SDK's test fixtures and
  generates the response schemas in the SDK's `openapi.yaml`. It depends on
  `nhl-api-ts` via `workspace:*` and imports it by package name.

## Commands

Run these from the repository root. They forward to the packages with
`pnpm -r` or `pnpm --filter`.

```bash
pnpm install
pnpm test                    # node:test in every package, runs src/*.mts directly (--conditions=source)
pnpm typecheck               # tsc --noEmit on every package
pnpm typecheck:test          # typecheck the SDK tests
pnpm typecheck:examples      # typecheck the SDK examples/
pnpm typecheck:types         # typecheck the response-type augmentation test (test/types)
pnpm typecheck:scripts       # typecheck the SDK build scripts (scripts/)
pnpm lint:check              # biome; `pnpm lint:fix` to autofix
pnpm build                   # emits packages/nhl-api-ts/dist/
pnpm api:report              # regenerate api-report.md (builds first)
pnpm docs:llms               # regenerate llms-full.txt from llms.txt
pnpm api-types:fetch         # api-types-infer: cache live responses (network; never in CI)
pnpm api-types:infer         # api-types-infer: write reports, drafts and shapes/
pnpm api-types:fixtures      # api-types-infer: regenerate the SDK's test/fixtures
pnpm api-types:check         # api-types-infer: refetch and diff against shapes/ (network)
pnpm openapi:schemas         # api-types-infer: regenerate openapi.yaml response schemas
node --conditions=source packages/nhl-api-ts/src/cli.mts --help   # run the CLI from source
```

Run a single test file from `packages/nhl-api-ts` with
`node --conditions=source --test test/teams.test.mts`.

Before you finish a change, run (from the root):
`pnpm lint:check && pnpm typecheck && pnpm typecheck:test && pnpm typecheck:examples && pnpm typecheck:types && pnpm typecheck:scripts && pnpm test`.
CI also runs `pnpm build`, `pnpm api:report` and `pnpm docs:llms` and fails if
`api-report.md` or `llms-full.txt` changes.

## Layout

```
package.json           private workspace root: lint, changesets, forwarding scripts
tsconfig.base.json     compiler options shared by both packages
packages/api-types-infer/
  src/                 fetch, infer, check, fixtures, openapi (#src/*.mjs imports)
  shapes/              committed shape snapshots, the drift baseline
  test/                openapi.yaml staleness test
  .api-types/          cached raw responses, reports, drafts (gitignored)
packages/nhl-api-ts/
  src/
    index.mts          public barrel. Everything exported here is public API
    nhl-client.mts     NHLClient: builds config + HttpClient, wires modules
    config.mts         ClientOptions / ClientConfig
    http-client.mts    Endpoint base URLs, buildUrl, HttpClient.get, status -> error mapping
    errors.mts         NHLApiException hierarchy
    utils.mts          Id, sleep
    types/             response interfaces, one file per module. Public API (see below)
    api/<module>.mts   one class per client.<module> (teams, schedule, edge, ...)
    api/query/         QueryBuilder, *Query filters, default sorts
    cli.mts            bin entry (#!/usr/bin/env node)
    cli/commands.mts   MODULES: the CLI spec for every SDK method
    cli/run.mts        argument parsing, help, exit codes
  test/                one *.test.mts per module. fetch-mock.mts mocks globalThis.fetch
    fixtures/          typed fixtures written by `pnpm api-types:fixtures`
    types/             response-type augmentation test (`pnpm typecheck:types`)
  examples/            runnable scripts, typechecked in CI
  docs/                concepts, errors, recipes
  scripts/             build-llms-full.mts (`pnpm docs:llms`)
  skills/nhl-api-ts/   SKILL.md, the agent skill (linked from llms.txt)
  openapi.yaml         every HTTP path the SDK calls; response schemas are generated
  llms.txt             index for LLMs; llms-full.txt is generated from it
```

Paths in the rest of this file (`src/`, `test/`, `docs/`, ...) are relative to
`packages/nhl-api-ts/`.

## Conventions

- Source files are `.mts`. Internal imports use the `#src/*.mjs` subpath
  import, for example `import { Endpoint } from '#src/http-client.mjs'`. Never
  use relative imports inside `src/`. Tests import from `#src/...` or from
  `./fetch-mock.mts`.
- `tsconfig.base.json` sets `erasableSyntaxOnly` and `verbatimModuleSyntax`. Do not
  use enums, namespaces or parameter properties. Use `import type` for
  type-only imports. Model enums as `const X = {...} as const` plus a
  same-named type (see `Endpoint`, `PositionTypes`, `NHLApiErrorCode`).
- Biome style: single quotes, 2-space indent, and block statements are required
  (`if (x) { return; }`). Run `pnpm lint:fix` instead of formatting by hand.
- Use descriptive names. No single-letter variables.
- Every endpoint method is `async`, takes **one options object**, and returns
  parsed JSON typed with a named interface from `src/types/` (or `Team` /
  `DailySchedule`). IDs and seasons are typed `Id` (`string | number`).
- Response types in `src/types/` come from real responses (`pnpm api-types:fetch`,
  `api-types:infer`, `api-types:check`). Rules: every object type is an `interface`
  (never a `type` alias, consumers augment them); unions are built from
  registries (`PlayTypes`, `SkaterReportRows`, `GoalieReportRows`); enum-like
  strings use `OpenUnion<...>`; no index signatures; a field is optional only if
  some response lacks it, nullable only if some response sends `null`. Export
  new types from `src/types/index.mts` by file. Add a trimmed fixture
  (`pnpm api-types:fixtures`) and run `pnpm typecheck:types`.
- Endpoints that unwrap an envelope return `response.data ?? []` (stats API)
  or a named field (`standings`, `games`, `gameLog`, `seasons`).
- Optional date/season params default to the literal path segment `now`, which
  the API redirects to the current date or season.
- Invalid user input throws `RangeError`. HTTP failures throw an
  `NHLApiException` subclass (see `docs/errors.md`). Don't add new error types
  without updating `docs/errors.md`.
- `helpers` write progress to **stderr** (`console.error`) so CLI stdout stays
  pure JSON. Never `console.log` from `src/`.

## Adding or changing an endpoint

1. Add the method to the module class in `src/api/<module>.mts`, with a JSDoc
   block that has `@param params.x` lines and an `@example` that shows the
   real URL or an SDK call.
2. Add a matching `CommandSpec` in `src/cli/commands.mts`.
   `test/cli.test.mts` ("exposes every SDK method as a command") fails if an
   SDK method has no CLI command. That test lists methods from the class
   prototype, so if you add a **private** helper method, add its name to the
   exclusion list in the test.
3. Add a test in `test/<module>.test.mts` that asserts the exact URL using
   `mockFetch` + `calledUrls`. Assert query params with `queryOf(url)`.
4. Update the docs: `README.md` (API modules list), `openapi.yaml` (the HTTP
   path and its named response; response schemas are generated, run
   `pnpm openapi:schemas` after changing `src/types/`), and `docs/` if behavior
   is non-obvious.
5. Regenerate `api-report.md` (`pnpm api:report`) and `llms-full.txt`
   (`pnpm docs:llms`). CI fails if either is stale.
6. Add a changeset: `pnpm changeset`.

## Testing rules

- Tests never hit the network. Use `mockFetch(responder)` from
  `test/fetch-mock.mts` and `afterEach(() => mock.restoreAll())`.
- Assert on the full URL string. The URL is the contract with the NHL API.
- CLI tests call `runCli(argv, io)` with captured stdout/stderr and check the
  exit code: `0` ok, `1` API/network error, `2` usage error.

## Generated files: do not edit by hand

- `packages/nhl-api-ts/api-report.md`: `pnpm api:report` (api-extractor, config in
  `api-extractor.json`)
- `packages/nhl-api-ts/llms-full.txt`: `pnpm docs:llms` (script in `scripts/build-llms-full.mts`)
- `dist/`: `pnpm build`, gitignored

## Things to avoid

- Adding runtime dependencies.
- Renaming fields in API payloads. Responses pass through untouched. The only
  SDK-built shapes are `Team` and `DailySchedule`.
- Calling the live API from tests or CI.
- Committing `dist/` or `.env`.
