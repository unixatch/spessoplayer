export type _optionsObject<T = unknown> = Partial<{
  confirmation:    boolean,
  noTable:         boolean,   toStdout:        boolean,
  format:          string,    fileOutputs:     string[],
  noProgress:      boolean,   progressDelay:   number,
  effects:         object[],  maxThreads:      number,
  showUsage:       boolean,
  externalEffects: T extends "perSongOptions" ? boolean : boolean[]
}>;

interface privateProperties {
  logFilePath?: string, dryRun?: string,
  files: Set<string>[]
}
export
interface allOptions
extends _optionsObject<"allOptions">, privateProperties {
  songIndex?: number
}
export
interface perSongOptions
extends _optionsObject<"perSongOptions">, privateProperties {
  midiFile:     string, soundfontFile: string | SharedArrayBuffer,
  indexOfGroup: number
}

export interface groupsChecked {
  length: number, [key: number]: boolean | null
}
export interface UnwantedNonZeroErrorExtras {
  exitCode: number,
  stdout?: Buffer, stderr?: Buffer
}
export type boundFunctionLessFirstArg<T extends (...args: any) => any> = (
  T extends (ignored: infer _, ...args: infer P) => any
    ? (...args: P) => ReturnType<T> : never
);

