import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { normalizeDate } from '#src/index.mjs';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

const WEB = 'https://api-web.nhle.com/v1/';

describe('Schedule', () => {
  it('dailySchedule with date', async () => {
    const fetchSpy = mockFetch();
    await newClient().schedule.dailySchedule({ date: '2021-01-01' });
    assert.deepEqual(calledUrls(fetchSpy), [`${WEB}schedule/2021-01-01`]);
  });

  it('dailySchedule fixes non-padded dates', async () => {
    const fetchSpy = mockFetch();
    await newClient().schedule.dailySchedule({ date: '2024-10-9' });
    assert.deepEqual(calledUrls(fetchSpy), [`${WEB}schedule/2024-10-09`]);
  });

  it('dailySchedule rejects bad dates without requesting', async () => {
    const fetchSpy = mockFetch();
    for (const date of ['2024-10-09-', '2024-02-30', '2024-13-01', 'today']) {
      await assert.rejects(
        newClient().schedule.dailySchedule({ date }),
        RangeError,
      );
    }
    assert.equal(fetchSpy.mock.callCount(), 0);
  });

  it('dailySchedule defaults to today (local time)', async () => {
    const fetchSpy = mockFetch();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const result = await newClient().schedule.dailySchedule();
    assert.deepEqual(calledUrls(fetchSpy), [`${WEB}schedule/${today}`]);
    assert.equal(result.date, today);
  });

  it('dailySchedule picks the matching day out of the game week', async () => {
    mockFetch(() => ({
      body: {
        nextStartDate: '2024-10-16',
        previousStartDate: '2024-10-02',
        gameWeek: [
          { date: '2024-10-08', games: [{ id: 1 }] },
          { date: '2024-10-09', games: [{ id: 2 }, { id: 3 }] },
        ],
      },
    }));
    const result = await newClient().schedule.dailySchedule({
      date: '2024-10-09',
    });
    assert.deepEqual(result, {
      nextStartDate: '2024-10-16',
      previousStartDate: '2024-10-02',
      date: '2024-10-09',
      oddsPartners: null,
      games: [{ id: 2 }, { id: 3 }],
      numberOfGames: 2,
    });
  });

  it('dailySchedule omits games when no day matches', async () => {
    mockFetch(() => ({ body: { gameWeek: [] } }));
    const result = await newClient().schedule.dailySchedule({
      date: '2024-10-09',
    });
    assert.equal('games' in result, false);
    assert.equal('numberOfGames' in result, false);
  });

  const cases: [
    string,
    (client: ReturnType<typeof newClient>) => Promise<unknown>,
    string,
  ][] = [
    [
      'weeklySchedule (date)',
      (client) => client.schedule.weeklySchedule({ date: '2021-01-01' }),
      'schedule/2021-01-01',
    ],
    [
      'weeklySchedule (now)',
      (client) => client.schedule.weeklySchedule(),
      'schedule/now',
    ],
    [
      'teamMonthlySchedule (month)',
      (client) =>
        client.schedule.teamMonthlySchedule({
          teamAbbr: 'BUF',
          month: '2023-11',
        }),
      'club-schedule/BUF/month/2023-11',
    ],
    [
      'teamMonthlySchedule (now)',
      (client) => client.schedule.teamMonthlySchedule({ teamAbbr: 'BUF' }),
      'club-schedule/BUF/month/now',
    ],
    [
      'teamWeeklySchedule (now)',
      (client) => client.schedule.teamWeeklySchedule({ teamAbbr: 'BUF' }),
      'club-schedule/BUF/week/now',
    ],
    [
      'teamWeeklySchedule (date)',
      (client) =>
        client.schedule.teamWeeklySchedule({
          teamAbbr: 'BUF',
          date: '2024-02-10',
        }),
      'club-schedule/BUF/week/2024-02-10',
    ],
    [
      'teamSeasonSchedule',
      (client) =>
        client.schedule.teamSeasonSchedule({
          teamAbbr: 'BUF',
          season: '20202021',
        }),
      'club-schedule-season/BUF/20202021',
    ],
    [
      'teamSeasonSchedule (now)',
      (client) => client.schedule.teamSeasonSchedule({ teamAbbr: 'BUF' }),
      'club-schedule-season/BUF/now',
    ],
    [
      'calendarSchedule',
      (client) => client.schedule.calendarSchedule({ date: '2023-11-08' }),
      'schedule-calendar/2023-11-08',
    ],
    [
      'calendarSchedule (now)',
      (client) => client.schedule.calendarSchedule(),
      'schedule-calendar/now',
    ],
    [
      'playoffCarousel',
      (client) => client.schedule.playoffCarousel({ season: '20232024' }),
      'playoff-series/carousel/20232024',
    ],
    [
      'playoffSeriesSchedule',
      (client) =>
        client.schedule.playoffSeriesSchedule({
          season: '20232024',
          series: 'a',
        }),
      'schedule/playoff-series/20232024/a',
    ],
    [
      'playoffBracket',
      (client) => client.schedule.playoffBracket({ year: '2024' }),
      'playoff-bracket/2024',
    ],
  ];

  for (const [name, call, resource] of cases) {
    it(name, async () => {
      const fetchSpy = mockFetch();
      await call(newClient());
      assert.deepEqual(calledUrls(fetchSpy), [`${WEB}${resource}`]);
    });
  }

  it('team schedules unwrap games', async () => {
    mockFetch(() => ({ body: { games: [{ id: 1 }] } }));
    const client = newClient();
    assert.deepEqual(
      await client.schedule.teamMonthlySchedule({ teamAbbr: 'BUF' }),
      [{ id: 1 }],
    );
    assert.deepEqual(
      await client.schedule.teamWeeklySchedule({ teamAbbr: 'BUF' }),
      [{ id: 1 }],
    );
  });
});

describe('normalizeDate', () => {
  it('matches strptime("%Y-%m-%d")', () => {
    assert.equal(normalizeDate('2024-1-5'), '2024-01-05');
    assert.equal(normalizeDate('2024-02-29'), '2024-02-29');
    assert.throws(() => normalizeDate('2023-02-29'), RangeError);
    assert.throws(() => normalizeDate('24-01-01'), RangeError);
  });
});
