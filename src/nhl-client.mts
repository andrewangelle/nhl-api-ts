import { Edge } from '#src/api/edge.mjs';
import { GameCenter } from '#src/api/game-center.mjs';
import { Helpers } from '#src/api/helpers.mjs';
import { Misc } from '#src/api/misc.mjs';
import { Players } from '#src/api/players.mjs';
import { Schedule } from '#src/api/schedule.mjs';
import { Standings } from '#src/api/standings.mjs';
import { Stats } from '#src/api/stats.mjs';
import { Teams } from '#src/api/teams.mjs';
import { ClientConfig, type ClientOptions } from '#src/config.mjs';
import { HttpClient } from '#src/http-client.mjs';

/**
 * The main class used to access the NHL API.
 *
 * @example
 * const client = new NHLClient();
 * const client = new NHLClient({ debug: true }); // for a lil extra logging
 * const teams = await client.teams.teams();
 */
export class NHLClient {
  readonly config: ClientConfig;
  readonly httpClient: HttpClient;

  readonly teams: Teams;
  readonly standings: Standings;
  readonly schedule: Schedule;
  readonly gameCenter: GameCenter;
  readonly stats: Stats;
  readonly misc: Misc;
  readonly helpers: Helpers;
  readonly players: Players;
  readonly edge: Edge;

  constructor(options: ClientOptions = {}) {
    this.config = new ClientConfig(options);
    this.httpClient = new HttpClient(this.config);

    this.teams = new Teams(this.httpClient);
    this.standings = new Standings(this.httpClient);
    this.schedule = new Schedule(this.httpClient);
    this.gameCenter = new GameCenter(this.httpClient);
    this.stats = new Stats(this.httpClient);
    this.misc = new Misc(this.httpClient);
    this.helpers = new Helpers(this.httpClient);
    this.players = new Players(this.httpClient);
    this.edge = new Edge(this.httpClient);
  }
}
