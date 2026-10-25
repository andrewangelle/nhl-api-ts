# Add a response type for a new endpoint

Use this when you've added an SDK method and need its response interface.
The SDK side of the endpoint (method, CLI command, URL test) is covered in
[AGENTS.md](../../../../AGENTS.md#adding-or-changing-an-endpoint). This recipe
covers the type.

The example adds `client.misc.partnerGameOdds({ countryCode })`.

## 1. Add samples

Samples live in `buildSamples()` in `src/samples.mts`. Each one is an
endpoint name, a set of tags and an SDK call:

```ts
for (const countryCode of ['US', 'CA']) {
  add('misc.partnerGameOdds', { country: countryCode }, (client) =>
    client.misc.partnerGameOdds({ countryCode }),
  );
}
```

- The endpoint name is `<module>.<method>`, exactly as on the client. It is
  the folder under `.api-types/raw/` and the key in `src/specs.mts`.
- Tags name the variant. They become the file name
  (`country-US.json`) and show up in the report's "missing when" column, so
  keep them short and readable.
- Add at least two samples that differ in a way that could change the payload.
  With one sample every field looks required. See
  [Cover a new variant](cover-a-new-variant.md).

## 2. Add a spec, if needed

Skip this if the SDK returns the body as-is and the method name makes a good
interface name (`partnerGameOdds` becomes `PartnerGameOdds`). Otherwise add an
entry to `SPECS` in `src/specs.mts`:

```ts
'misc.countries': { unwrap: 'data', name: 'Country' },
```

See [Endpoint specs](endpoint-specs.md) for `unwrap`, `groupBy`, `ALIASES` and
`emit`.

## 3. Fetch and infer

```bash
pnpm api-types:fetch --only misc.partnerGameOdds
pnpm api-types:infer
```

`fetch` prints one line per sample with its HTTP status. A `4xx`/`5xx` sample is
cached but left out of the type (see [Work with the cache](work-with-the-cache.md)).

## 4. Write the interface

Open the two files `infer` wrote for the endpoint:

- `.api-types/report/misc.partnerGameOdds.md`: every path, whether it is
  required, optional or nullable, the kinds seen and the observed values.
- `.api-types/draft/misc.partnerGameOdds.mts`: draft interfaces.

Copy what you need from the draft into
`packages/nhl-api-ts/src/types/misc.mts`, then:

- Reuse existing shared types (`LocalizedString`, `TeamLogo`, ...) instead of
  the draft's copies.
- Rename interfaces where the generated name is clumsy.
- Add JSDoc where a field isn't obvious.
- Check the report before trusting an `OpenUnion<...>`: the draft only lists
  values it saw.

The type rules (interfaces only, no index signatures, optional only if missing
somewhere, nullable only if `null` was seen) are in
[AGENTS.md](../../../../AGENTS.md#conventions). See
[Read reports and drafts](read-reports-and-drafts.md) for how to read the
output.

Export the new type from `src/types/index.mts` and use it as the method's
return type.

## 5. Regenerate fixtures and OpenAPI

```bash
pnpm api-types:fixtures
pnpm openapi:schemas
pnpm lint:fix
pnpm typecheck:test && pnpm typecheck:types && pnpm test
```

If the endpoint has a new named response, add it to `RESPONSES` in
`src/openapi.mts` and reference it from the path in `openapi.yaml`. See
[Regenerate fixtures and OpenAPI](regenerate-fixtures-and-openapi.md).

## 6. Commit

Commit the type, `shapes/misc.partnerGameOdds.json`, the fixture in
`packages/nhl-api-ts/test/fixtures/` and `openapi.yaml`. `.api-types/` is
gitignored.
