import { Endpoint, type HttpClient } from '#src/http-client.mjs';
import type { Id, JsonObject } from '#src/utils.mjs';

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** Today's date (local time) as YYYY-MM-DD. */
function today(): string {
  const d = new Date();
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Parses and normalizes a YYYY-MM-DD date the way Python's
 * `strptime(date, "%Y-%m-%d")` does: single-digit months/days are accepted
 * ("2024-10-9" -> "2024-10-09") and impossible dates are rejected.
 */
export function normalizeDate(date: string): string {
  const match =
    /^(\d{4})-(1[0-2]|0[1-9]|[1-9])-(3[01]|[12]\d|0[1-9]|[1-9]| [1-9])$/.exec(
      date,
    );
  if (!match) {
    throw new RangeError('Invalid date format. Please use YYYY-MM-DD.');
  }
  const [year, month, day] = match.slice(1).map((v) => Number(v.trim()));
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
  oddsPartners: JsonObject[] | null;
  games?: JsonObject[];
  numberOfGames?: number;
}

export class Schedule {
  readonly client: HttpClient;

  constructor(httpClient: HttpClient) {
    this.client = httpClient;
  }

  /**
   * Gets NHL schedule for a specific date.
   *
   * @param params.date Date in YYYY-MM-DD format. Defaults to today.
   * @throws RangeError If the date is not a valid YYYY-MM-DD date
   * @example await client.schedule.dailySchedule({ date: '2024-10-09' })
   */
  async dailySchedule({
    date,
  }: {
    date?: string;
  } = {}): Promise<DailySchedule> {
    date = date ? normalizeDate(date) : today();

    const scheduleData = await (
      await this.client.get(Endpoint.API_WEB_V1, `schedule/${date}`)
    ).json();

    const responsePayload: DailySchedule = {
      nextStartDate: scheduleData.nextStartDate ?? null,
      previousStartDate: scheduleData.previousStartDate ?? null,
      date,
      oddsPartners: scheduleData.oddsPartners ?? null,
    };

    const gameWeek: JsonObject[] = scheduleData.gameWeek ?? [];
    const matchingDay = gameWeek.find((day) => day.date === date);
    if (matchingDay) {
      const games: JsonObject[] = matchingDay.games ?? [];
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
  async weeklySchedule({ date }: { date?: string } = {}): Promise<JsonObject> {
    const res = date ? date : 'now';
    return (
      await this.client.get(Endpoint.API_WEB_V1, `schedule/${res}`)
    ).json();
  }

  /**
   * Gets monthly schedule for a specified team.
   *
   * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
   * @param params.month Month in YYYY-MM format. Defaults to "now".
   * @example https://api-web.nhle.com/v1/club-schedule/BUF/month/2023-11
   */
  async teamMonthlySchedule({
    teamAbbr,
    month,
  }: {
    teamAbbr: string;
    month?: string;
  }): Promise<JsonObject[]> {
    const resource = `club-schedule/${teamAbbr}/month/${month ? month : 'now'}`;
    const response = await (
      await this.client.get(Endpoint.API_WEB_V1, resource)
    ).json();
    return response.games ?? [];
  }

  /**
   * Gets weekly schedule for a specified team.
   *
   * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
   * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
   * @example https://api-web.nhle.com/v1/club-schedule/BUF/week/2024-02-10
   */
  async teamWeeklySchedule({
    teamAbbr,
    date,
  }: {
    teamAbbr: string;
    date?: string;
  }): Promise<JsonObject[]> {
    const resource = `club-schedule/${teamAbbr}/week/${date ? date : 'now'}`;
    const response = await (
      await this.client.get(Endpoint.API_WEB_V1, resource)
    ).json();
    return response.games ?? [];
  }

  /**
   * Gets the full season schedule for a specified team.
   *
   * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
   * @param params.season Season in YYYYYYYY format, e.g. 20232024
   * @example https://api-web.nhle.com/v1/club-schedule-season/BUF/20232024
   */
  async teamSeasonSchedule({
    teamAbbr,
    season,
  }: {
    teamAbbr: string;
    season: Id;
  }): Promise<JsonObject> {
    return (
      await this.client.get(
        Endpoint.API_WEB_V1,
        `club-schedule-season/${teamAbbr}/${season}`,
      )
    ).json();
  }

  /**
   * Gets the schedule in calendar format for a specified date.
   *
   * @param params.date Date in YYYY-MM-DD format
   * @example https://api-web.nhle.com/v1/schedule-calendar/2023-11-08
   */
  async calendarSchedule({ date }: { date: string }): Promise<JsonObject> {
    return (
      await this.client.get(Endpoint.API_WEB_V1, `schedule-calendar/${date}`)
    ).json();
  }

  /**
   * Gets all playoff series information up to the current round.
   *
   * @param params.season Season in YYYYYYYY format, e.g. 20232024
   * @example https://api-web.nhle.com/v1/playoff-series/carousel/20232024
   */
  async playoffCarousel({ season }: { season: Id }): Promise<JsonObject> {
    return (
      await this.client.get(
        Endpoint.API_WEB_V1,
        `playoff-series/carousel/${season}`,
      )
    ).json();
  }

  /**
   * Returns the schedule and results for a specified playoff series matchup.
   *
   * @param params.season Season in YYYYYYYY format, e.g. 20232024
   * @param params.series Series letter, e.g. "a" (first round) through "o" (final)
   * @example https://api-web.nhle.com/v1/schedule/playoff-series/20232024/a
   */
  async playoffSeriesSchedule({
    season,
    series,
  }: {
    season: Id;
    series: string;
  }): Promise<JsonObject> {
    return (
      await this.client.get(
        Endpoint.API_WEB_V1,
        `schedule/playoff-series/${season}/${series}`,
      )
    ).json();
  }

  /**
   * Returns the full playoff bracket for a given year.
   *
   * @param params.year Year the playoffs took place, e.g. 2024
   * @example https://api-web.nhle.com/v1/playoff-bracket/2024
   */
  async playoffBracket({ year }: { year: Id }): Promise<JsonObject> {
    return (
      await this.client.get(Endpoint.API_WEB_V1, `playoff-bracket/${year}`)
    ).json();
  }
}
