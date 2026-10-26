/**
 * Resolves the declared SDK type of each sample group through the TypeScript
 * type checker (ts-morph), so conform sees the real semantics: open unions,
 * optional and nullable members, index signatures and registry-built unions.
 */
import { relative } from 'node:path';
import {
  IndentationText,
  Project,
  QuoteKind,
  type SourceFile,
  type Type,
  ts,
} from 'ts-morph';

/** In-memory probe file; under `src/` because the SDK tsconfig has `rootDir: ./src`. */
const PROBE_FILE = 'src/__conform__.mts';

/** Edits match the SDK's Biome style, so the follow-up format pass changes little. */
const MANIPULATION = {
  indentationText: IndentationText.TwoSpaces,
  quoteKind: QuoteKind.Single,
};

export interface Resolved {
  expression: string;
  type?: Type;
  /** Why the expression didn't resolve. */
  error?: string;
}

export class Declarations {
  readonly project: Project;
  /** Directory that finding paths are made relative to. */
  readonly baseDir: string;
  private readonly importSpecifier: string;
  private probe?: SourceFile;

  constructor(project: Project, baseDir: string, importSpecifier: string) {
    this.project = project;
    this.baseDir = baseDir;
    this.importSpecifier = importSpecifier;
  }

  /** The SDK's own types, loaded with its real tsconfig. */
  static fromSdk(sdkDir: string): Declarations {
    const project = new Project({
      tsConfigFilePath: `${sdkDir}tsconfig.json`,
      skipAddingFilesFromTsConfig: true,
      manipulationSettings: MANIPULATION,
    });
    project.addSourceFilesAtPaths(`${sdkDir}src/types/**/*.mts`);
    return new Declarations(project, sdkDir, '#src/index.mjs');
  }

  /**
   * In-memory types for tests: one file's text, or files by name under
   * `src/types/` (an `index.mts` re-exporting each is added if missing).
   */
  static fromSource(source: string | Record<string, string>): Declarations {
    const files = typeof source === 'string' ? { 'index.mts': source } : source;
    const project = new Project({
      useInMemoryFileSystem: true,
      manipulationSettings: MANIPULATION,
      compilerOptions: {
        strict: true,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        target: ts.ScriptTarget.ESNext,
      },
    });
    for (const [name, text] of Object.entries(files)) {
      project.createSourceFile(`/sdk/src/types/${name}`, text);
    }
    if (!files['index.mts']) {
      project.createSourceFile(
        '/sdk/src/types/index.mts',
        Object.keys(files)
          .map(
            (name) =>
              `export type * from './${name.replace(/\.mts$/, '.mjs')}';`,
          )
          .join('\n'),
      );
    }
    return new Declarations(project, '/sdk/', './types/index.mjs');
  }

  /** The probe file, a location to read property types at. */
  get location(): SourceFile {
    if (!this.probe) {
      throw new Error('resolve() has not run');
    }
    return this.probe;
  }

  /** Resolves each type expression (`Roster`, `SkaterReportRows['summary']`) against the SDK's exports. */
  resolve(expressions: string[]): Map<string, Resolved> {
    const lines = expressions.map(
      (expression, index) => `export type T${index} = Sdk.${expression};`,
    );
    const path = `${this.baseDir}${PROBE_FILE}`;
    this.probe = this.project.createSourceFile(
      path,
      `import type * as Sdk from '${this.importSpecifier}';\n${lines.join('\n')}\n`,
      { overwrite: true },
    );

    const errors = new Map<number, string>();
    for (const diagnostic of this.probe.getPreEmitDiagnostics()) {
      const line = diagnostic.getLineNumber();
      if (line !== undefined) {
        errors.set(
          line,
          ts.flattenDiagnosticMessageText(
            diagnostic.getMessageText() as string | ts.DiagnosticMessageChain,
            ' ',
          ),
        );
      }
    }

    const out = new Map<string, Resolved>();
    expressions.forEach((expression, index) => {
      // Line 1 is the import; a failed import fails every alias.
      const error = errors.get(1) ?? errors.get(index + 2);
      out.set(
        expression,
        error
          ? { expression, error }
          : {
              expression,
              type: this.probe?.getTypeAliasOrThrow(`T${index}`).getType(),
            },
      );
    });
    return out;
  }

  relativePath(file: string): string {
    return relative(this.baseDir, file);
  }
}
