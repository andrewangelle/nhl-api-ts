# Extending response types

The SDK's response types are derived from real API responses, but the NHL
adds fields without notice. You can extend any type without forking the SDK.

## Add a field to a response type

Every object type is an `interface`, so you can merge into it with module
augmentation. Put this in any `.ts`/`.mts` file that's part of your project:

```ts
declare module 'nhl-api-ts' {
  interface Boxscore {
    someNewField?: string;
  }
  interface RosterPlayer {
    contractExpiry?: string;
  }
}
```

The original fields stay, unknown fields still fail to compile, and the change
applies project-wide. Nested shapes are interfaces too (`TeamLogo`,
`GoalDetails`, `PeriodDescriptor`, ...), so you can reach into them the same
way. Declare the new field as optional unless you know the NHL always sends it.

The augmentation has to match the payload. If a later SDK release adds the same
field with a different type, TypeScript reports a conflicting declaration. That
is your cue to delete the augmentation.

## Add a play type, skater report or goalie report

Unions are built from registries, because a `type` union can't be merged. Add
an entry to the registry and the union picks it up:

```ts
declare module 'nhl-api-ts' {
  interface PlayTypes {
    'new-event': { typeDescKey: 'new-event'; eventId: number; extra: string };
  }
  interface SkaterReportRows {
    myReport: { playerId: number; rating: number };
  }
  interface GoalieReportRows {
    myGoalieReport: { playerId: number; rating: number };
  }
}

const pbp = await client.gameCenter.playByPlay({ gameId: 2023020280 });
for (const play of pbp.plays) {
  if (play.typeDescKey === 'new-event') {
    console.log(play.extra);
  }
}

await client.stats.skaterStatsWithQueryContext({
  queryContext,
  reportType: 'myReport', // type-checked, and the rows are typed
});
```

## One call site: cast

When a single call needs a field that isn't typed, a cast is enough:

```ts
const box = (await client.gameCenter.boxscore({ gameId })) as Boxscore & {
  someNewField: number;
};
```

Methods don't take a type argument, because the client binds each module's
functions and that would drop generics.

## The CLI

The CLI prints the raw JSON and doesn't use these types. An unknown
`reportType` still reaches the API, so a report the NHL adds later works from
the command line before the SDK knows about it.
