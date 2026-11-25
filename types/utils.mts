import type { effectsListType } from "./mainFunctions.mts"

/** If T is perSongOptions, make V a list or not */
type pSO<T = string, V = unknown> = (
  T extends "perSongOptions"
    ? V : V[]
)
export type ExtractSetType<T extends Set<any> | Set<any>[]> = (
  T extends Set<infer Type> | Set<infer Type>[]
    ? Type : never
)
export type gettingAsyncSetTimeout = typeof setTimeout & {
  [key in symbol]: typeof setTimeout.__promisify__
}

/** General properties available for all modes inside perSongOptions */
export type nonSpecificProperties =
  | "loopAmount" | "loopStart"       | "loopEnd"
  | "volume"     | "channelVolume"   | "drumsVolume" | "reverbVolume"
  | "effects"    | "externalEffects" | "sampleRate"  | "loopFade"
  | "loopFadeStart" | "loopFadeDuration" | "loopFadeInterpolation"
  | "hardStop"
/** perSongOptions exclusive properties for file mode */
export type fileModeOptionsKeys =
  | "fileOutputs" | "noProgress" | "progressDelay" | "showUsage"
/** perSongOptions exclusive properties for server mode */
export type serverModeOptionsKeys = "daemon"


/** _options public property inside the class Options */
export type _optionsObject<T = unknown> = Partial<{
  confirmation:  boolean,                 showUsage:     boolean,
  noTable:       boolean,                 toStdout:      boolean,
  format:        string,                  fileOutputs:   string[],
  noProgress:    boolean,                 progressDelay: number,
  effects:       pSO<T, effectsListType>, maxThreads:    number,
  loopAmount:    pSO<T, number>,          loopStart:     pSO<T, number | string>,
  loopEnd:       pSO<T, number | string>,
  drumsVolume:   pSO<T, number>,          volume:        pSO<T, number>,
  /** A list of volumes per channel */
  channelVolume: pSO<T, number[]>,        reverbVolume:  pSO<T, number>,
  sampleRate:    pSO<T, number>,
  /** if it should not smooth out the end */
  hardStop:      pSO<T, boolean>,
  /** if it uses an external program or a builtin */
  externalEffects: pSO<T, boolean>,
  /**
    Just like a normal loop but at the end
    it does 1 more then immediately fades away
  */
  loopFade: boolean,
  loopFadeStart: pSO<T, number>,   loopFadeDuration: pSO<T, number>,
  loopFadeInterpolation: pSO<T, string | number>, daemon: boolean
  [key: string]: any
}>;
export type dryRunType = "\\\\.\\nul" | "/dev/null"
// Just the keys, no index signatures
export type allOptionalOptionsKeys = keyof {
  [K in keyof allOptions as string extends K ? never : K]: allOptions[K]
} | "stdoutEffects" | "stdoutReverbVolume"

interface privateProperties {
  logFilePath?: string, dryRun?: dryRunType,
  files: Set<string>[]
}
/** Options.all return type */
export
interface allOptions
extends _optionsObject<"allOptions">, privateProperties {
  songIndex?: number
}
export
interface perSongOptions
extends _optionsObject<"perSongOptions">, privateProperties {
  midiFile:     string, soundfontFile: string | SharedArrayBuffer,
  /** index of the Set/group the song is in */
  indexOfGroup: number
}

/** groups checker's object inside method Options.files */
export interface groupsChecked {
  length: number, [key: number]: boolean | null
}
export interface UnwantedNonZeroErrorExtras {
  exitCode: number,
  stdout?: string[], stderr?: string[]
}
export type boundFunctionLessFirstArg<T extends (...args: any) => any> = (
  T extends (ignored: infer _, ...args: infer P) => any
    ? (...args: P) => ReturnType<T> : never
);

