import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { type EmitOptions, Emitter } from '#probe/emit.mjs';
import {
  finishSample,
  merge,
  newNode,
  type ShapeNode,
  tagLabel,
} from '#probe/shape.mjs';

export interface RawSample {
  tags: Record<string, string>;
  url: string;
  status: number;
  body: unknown;
}

/** How the SDK unwraps each endpoint, and how its samples are grouped into one type. */
export interface EndpointSpec {
  /** Property of the body the SDK returns (`response.data`, ...). Omit to return the body. */
  unwrap?: string;
  /** A tag whose value splits the endpoint into separate types (report type, ...). */
  groupBy?: string;
  /** Name for the emitted root (or array item) interface. */
  name: string;
  emit?: EmitOptions;
}

export function loadSamples(rawDir: string): Map<string, RawSample[]> {
  const out = new Map<string, RawSample[]>();

  if (!existsSync(rawDir)) {
    return out;
  }

  for (const endpoint of readdirSync(rawDir)) {
    const samples: RawSample[] = [];
    for (const file of readdirSync(`${rawDir}/${endpoint}`)) {
      samples.push(
        JSON.parse(readFileSync(`${rawDir}/${endpoint}/${file}`, 'utf8')),
      );
    }
    out.set(endpoint, samples);
  }

  return out;
}

export function buildShape(
  samples: RawSample[],
  unwrap: string | undefined,
): ShapeNode {
  const root = newNode();

  samples.forEach((sample, index) => {
    if (sample.status !== 200) {
      return;
    }
    let value = sample.body;
    if (unwrap !== undefined) {
      value = (value as Record<string, unknown> | null)?.[unwrap] ?? [];
    }
    const label = tagLabel(sample.tags);
    merge(root, value, label, index);
    finishSample(root, index, label);
  });

  return root;
}

export function emitFor(
  shape: ShapeNode,
  spec: EndpointSpec,
): { type: string; interfaces: Map<string, string> } {
  const emitter = new Emitter(spec.name, spec.emit);
  const target = shape.items && shape.kinds.array ? shape.items : shape;
  const type = emitter.emitRoot(target);
  return { type, interfaces: emitter.interfaces };
}
