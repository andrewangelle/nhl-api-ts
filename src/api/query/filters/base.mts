export abstract class QueryBase {
  abstract toQuery(): string;
  abstract validate(): boolean | undefined;
}
