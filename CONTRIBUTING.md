# Contributing

Thanks for helping out. This guide covers setup, the checks your change must
pass, and how releases work. If you are a coding agent, also read
[AGENTS.md](AGENTS.md).

## Setup

Requirements: Node.js >= 24 and pnpm (the version is pinned in
`package.json` under `packageManager`. Run `corepack enable` to use it).

```bash
git clone https://github.com/andrewangelle/nhl-api-ts.git
cd nhl-api-ts
pnpm install          # also installs the husky pre-commit hook
pnpm test
```

This is a pnpm workspace with two packages:

- `packages/nhl-api-ts`: the SDK and CLI, published to npm as `nhl-api-ts`.
- `packages/api-types-infer`: private tooling that derives the SDK's response
  types from live API responses. Never published.

Run the scripts below from the repository root. They forward to the right
package with `pnpm --filter`.

You don't need a build step to develop. Tests and the CLI run the TypeScript
sources directly through Node's type stripping and the `source` export
condition:

```bash
node --conditions=source packages/nhl-api-ts/src/cli.mts teams teams --compact
```

## Checks

CI runs these on every pull request. Run them locally first:

```bash
pnpm lint:check            # biome (pnpm lint:fix to autofix)
pnpm typecheck             # src of every package
pnpm typecheck:test        # SDK tests
pnpm typecheck:examples    # examples
pnpm typecheck:types       # response-type augmentation test
pnpm typecheck:scripts     # SDK build scripts
pnpm build
pnpm test                  # every package
pnpm api:report            # must leave api-report.md unchanged, or commit the change
pnpm docs:llms             # must leave llms-full.txt unchanged, or commit the change
```

The pre-commit hook runs `biome check --write` and `biome format --write` on
staged files.

## Making a change

1. Branch from `main`.
2. Make the change, with tests. Tests mock `fetch` and never call the real
   API. See `packages/nhl-api-ts/test/fetch-mock.mts` and any existing
   `test/*.test.mts`.
3. If the public API changed, run `pnpm api:report` and commit the updated
   `api-report.md`. Reviewers read its diff to see API changes.
4. Update the docs that cover your change: `README.md`, `docs/`,
   `openapi.yaml` for new HTTP paths, `examples/` if they're affected, and
   `skills/nhl-api-ts/SKILL.md` for usage guidance. Then run `pnpm docs:llms`.
5. Add a changeset: `pnpm changeset`. Pick `patch`, `minor` or `major` and
   write one line for the changelog. Breaking changes also need a section in
   [MIGRATION.md](packages/nhl-api-ts/MIGRATION.md) with before/after code.
6. Open a PR against `main`.

### Response types and api-types-infer

Response types in `packages/nhl-api-ts/src/types/` are derived from live API
responses. The tools live in `packages/api-types-infer`; none of them call the
API in CI. Paths below are relative to that package, except where noted:

```bash
pnpm api-types:fetch       # run the sample matrix, cache raw responses in .api-types/
pnpm api-types:infer       # write .api-types/report, .api-types/draft and shapes/
pnpm api-types:fixtures    # regenerate the SDK's typed fixtures in test/fixtures
pnpm api-types:check       # refetch and diff against shapes/
pnpm openapi:schemas       # regenerate the response schemas in the SDK's openapi.yaml from src/types
```

**Maintainers: run `pnpm api-types:check` before each release.** It prints new
fields, removed fields and required/optional flips. Update `src/types/`,
`packages/api-types-infer/shapes` (`pnpm api-types:infer`) and the fixtures to
match, then run `pnpm openapi:schemas`. A test in `api-types-infer` fails when the schemas in
`openapi.yaml` are stale.

### Adding an endpoint

See "Adding or changing an endpoint" in [AGENTS.md](AGENTS.md#adding-or-changing-an-endpoint).
In short: SDK method + JSDoc, CLI command in `src/cli/commands.mts`, a URL
test, README entry, `openapi.yaml` path, and the regenerated reports.

## Code style

- Biome handles formatting and lint. Don't fight it.
- `.mts` files, ESM only, with `#src/*.mjs` imports inside `src/`.
- Only erasable TypeScript syntax (no `enum`, `namespace` or parameter
  properties).
- No runtime dependencies.
- Use descriptive names. No single-letter variables.

## Releases

Releases are automated with [Changesets](https://github.com/changesets/changesets).
When changesets merge to `main`, the release workflow opens a
"chore: version packages" PR. Merging that PR publishes `nhl-api-ts` to npm and
creates a GitHub release tagged `nhl-api-ts@<version>`. `api-types-infer` is
private, so Changesets never versions, tags or publishes it
(`privatePackages` in `.changeset/config.json`).

## Reporting issues

Include the SDK method or CLI command, its arguments, and the output of the
same call with `--debug` (CLI) or `debug: true` (SDK), so we can see the exact
URL. The NHL API is undocumented and changes without notice. A request that
used to work and now returns 404 is often an upstream change.
