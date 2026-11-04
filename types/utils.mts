export interface _optionsObject {
  format?: string,
  fileOutputs: string[], noProgress?: boolean,
  progressDelay?: number, effects: object[],
  maxThreads?: number, externalEffects?: boolean[]
}

interface privateProperties {
  logFilePath?: string, dryRun?: string,
  files: Set<string>[]
}
export interface allOptions extends _optionsObject, privateProperties {
  songIndex?: number
}
export interface perSongOptions extends _optionsObject, privateProperties {
  midiFile: string, soundfontFile: string | SharedArrayBuffer
}

export interface groupsChecked {
  length: number, [key: number]: boolean | null
}
export interface UnwantedNonZeroErrorExtras {
  exitCode: number,
  stdout?: Buffer, stderr?: Buffer
}

