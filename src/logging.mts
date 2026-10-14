import { styleText } from 'node:util';

// ---- Colors ------------------------------------------------------------------
export type Style = Parameters<typeof styleText>[0];

export const toStdout = (format: Style) => (text: string) =>
  styleText(format, text, { stream: process.stdout });

export const toStderr = (format: Style) => (text: string) =>
  styleText(format, text, { stream: process.stderr });

export const colors = {
  dim: toStdout('dim'),
  pass: toStdout(['bold', 'green']),
  fail: toStdout(['bold', 'red']),
  ok: toStdout('green'),
  success: toStdout(['bold', 'green']),
  error: toStderr('red'),
  warn: toStderr('yellow'),
  bold: toStderr('bold'),
};
