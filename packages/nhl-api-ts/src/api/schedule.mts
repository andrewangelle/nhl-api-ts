import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  CalendarSchedule,
  ClubScheduleGame,
  OddsPartner,
  PlayoffBracket,
  PlayoffCarousel,
  PlayoffSeriesMeta,
  PlayoffSeriesSchedule,
  ScheduleGame,
  TeamSeasonSchedule,
  WeeklySchedule,
} from '#src/types/index.mjs';
import type { Id } from '#src/utils.mjs';

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

/** Today's date (local time) as YYYY-MM-DD. */
function today(): string {
  const now = new Date();
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Parses and normalizes a YYYY-MM-DD date: single-digit months/days are
 * accepted ("2024-10-9" -> "2024-10-09") and impossible dates are rejected.
 */
export function normalizeDate(date: string): string {
  const match =
    /^(\d{4})-(1[0-2]|0[1-9]|[1-9])-(3[01]|[12]\d|0[1-9]|[1-9]| [1-9])$/.exec(
      date,
    );
  if (!match) {
    throw new RangeError('Invalid date format. Please use YYYY-MM-DD.');
  }
  const [year, month, day] = match.slice(1).map((part) => Number(part.trim()));
  const parsed = new Date(0);
  parsed.setUTCFullYear(year, month - 1, day);
  if (parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new RangeError('Invalid date format. Please use YYYY-MM-DD.');
  }
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export interface DailySchedule {
  nextStartDate: string | null;
  previousStartDate: string | null;
  date: string;
  oddsPartners: OddsPartner[] | null;
  games?: ScheduleGame[];
  numberOfGames?: number;
}

/**
 * Gets NHL schedule for a specific date.
 *
 * @param params.date Date in YYYY-MM-DD format. Defaults to today.
 * @throws RangeError If the date is not a valid YYYY-MM-DD date
 * @example await client.schedule.dailySchedule({ date: '2024-10-09' })
 */
export async function dailySchedule(
  ctx: Context,
  { date }: { date?: string } = {},
): Promise<DailySchedule> {
  const resolvedDate = date ? normalizeDate(date) : today();

  const scheduleData = await (
    await ctx.get(Endpoint.API_WEB_V1, `schedule/${resolvedDate}`)
  ).json();

  const responsePayload: DailySchedule = {
    nextStartDate: scheduleData.nextStartDate ?? null,
    previousStartDate: scheduleData.previousStartDate ?? null,
    date: resolvedDate,
    oddsPartners: scheduleData.oddsPartners ?? null,
  };

  const gameWeek: WeeklySchedule['gameWeek'] = scheduleData.gameWeek ?? [];
  const matchingDay = gameWeek.find((day) => day.date === resolvedDate);
  if (matchingDay) {
    const games: ScheduleGame[] = matchingDay.games ?? [];
    responsePayload.games = games;
    responsePayload.numberOfGames = games.length;
  }
  return responsePayload;
}

/**
 * Gets NHL schedule for a week starting from the specified date.
 *
 * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
 * @example https://api-web.nhle.com/v1/schedule/2024-10-09
 */
export async function weeklySchedule(
  ctx: Context,
  { date }: { date?: string } = {},
): Promise<WeeklySchedule> {
  const res = date ? date : 'now';
  return (await ctx.get(Endpoint.API_WEB_V1, `schedule/${res}`)).json();
}

/**
 * Gets monthly schedule for a specified team.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @param params.month Month in YYYY-MM format. Defaults to "now".
 * @example https://api-web.nhle.com/v1/club-schedule/BUF/month/2023-11
 */
export async function teamMonthlySchedule(
  ctx: Context,
  { teamAbbr, month }: { teamAbbr: string; month?: string },
): Promise<ClubScheduleGame[]> {
  const resource = `club-schedule/${teamAbbr}/month/${month ? month : 'now'}`;
  const response = await (await ctx.get(Endpoint.API_WEB_V1, resource)).json();
  return response.games ?? [];
}

/**
 * Gets weekly schedule for a specified team.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
 * @example https://api-web.nhle.com/v1/club-schedule/BUF/week/2024-02-10
 */
export async function teamWeeklySchedule(
  ctx: Context,
  { teamAbbr, date }: { teamAbbr: string; date?: string },
): Promise<ClubScheduleGame[]> {
  const resource = `club-schedule/${teamAbbr}/week/${date ? date : 'now'}`;
  const response = await (await ctx.get(Endpoint.API_WEB_V1, resource)).json();
  return response.games ?? [];
}

/**
 * Gets the full season schedule for a specified team.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @param params.season Season in YYYYYYYY format, e.g. 20232024. Defaults to "now".
 * @example https://api-web.nhle.com/v1/club-schedule-season/BUF/20232024
 */
export async function teamSeasonSchedule(
  ctx: Context,
  { teamAbbr, season }: { teamAbbr: string; season?: Id },
): Promise<TeamSeasonSchedule> {
  return (
    await ctx.get(
      Endpoint.API_WEB_V1,
      `club-schedule-season/${teamAbbr}/${season ?? 'now'}`,
    )
  ).json();
}

/**
 * Gets the schedule in calendar format for a specified date.
 *
 * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
 * @example https://api-web.nhle.com/v1/schedule-calendar/2023-11-08
 */
export async function calendarSchedule(
  ctx: Context,
  { date }: { date?: string } = {},
): Promise<CalendarSchedule> {
  return (
    await ctx.get(Endpoint.API_WEB_V1, `schedule-calendar/${date ?? 'now'}`)
  ).json();
}

/**
 * Gets all playoff series information up to the current round.
 *
 * @param params.season Season in YYYYYYYY format, e.g. 20232024
 * @example https://api-web.nhle.com/v1/playoff-series/carousel/20232024
 */
export async function playoffCarousel(
  ctx: Context,
  { season }: { season: Id },
): Promise<PlayoffCarousel> {
  return (
    await ctx.get(Endpoint.API_WEB_V1, `playoff-series/carousel/${season}`)
  ).json();
}

/**
 * Returns the schedule and results for a specified playoff series matchup.
 *
 * @param params.season Season in YYYYYYYY format, e.g. 20232024
 * @param params.series Series letter, e.g. "a" (first round) through "o" (final)
 * @example https://api-web.nhle.com/v1/schedule/playoff-series/20232024/a
 */
export async function playoffSeriesSchedule(
  ctx: Context,
  { season, series }: { season: Id; series: string },
): Promise<PlayoffSeriesSchedule> {
  return (
    await ctx.get(
      Endpoint.API_WEB_V1,
      `schedule/playoff-series/${season}/${series}`,
    )
  ).json();
}

/**
 * Returns the metadata nhl.com uses to render a playoff series page: the
 * round title and the two seeded teams.
 *
 * @param params.year Year the playoffs took place, e.g. 2024
 * @param params.series Series letter, e.g. "a" (first round) through "o" (final). Case-insensitive.
 * @example https://api-web.nhle.com/v1/meta/playoff-series/2024/a
 */
export async function playoffSeriesMeta(
  ctx: Context,
  { year, series }: { year: Id; series: string },
): Promise<PlayoffSeriesMeta> {
  return (
    await ctx.get(Endpoint.API_WEB_V1, `meta/playoff-series/${year}/${series}`)
  ).json();
}

/**
 * Returns the full playoff bracket for a given year.
 *
 * @param params.year Year the playoffs took place, e.g. 2024
 * @example https://api-web.nhle.com/v1/playoff-bracket/2024
 */
export async function playoffBracket(
  ctx: Context,
  { year }: { year: Id },
): Promise<PlayoffBracket> {
  return (await ctx.get(Endpoint.API_WEB_V1, `playoff-bracket/${year}`)).json();
}

export const scheduleApi = {
  dailySchedule,
  weeklySchedule,
  teamMonthlySchedule,
  teamWeeklySchedule,
  teamSeasonSchedule,
  calendarSchedule,
  playoffCarousel,
  playoffSeriesSchedule,
  playoffSeriesMeta,
  playoffBracket,
} as const;
