export class InvalidQueryValueException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidQueryValueException';
  }
}
