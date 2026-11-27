/**
 * @module typeDefinitions
 */

import type { ServerResponse } from "node:http"
import type { ChildProcess, ChildProcessWithoutNullStreams } from "node:child_process"
import type { getWavHeader, getData } from "../wavFunctions.mts"
import type {
  FO_CONSTANTS, loadingAnimationCleanupFuncType
} from "./cli.mts"
import type {
  perSongOptions, dryRunType,
  nonSpecificProperties, fileModeOptionsKeys, serverModeOptionsKeys
} from "./utils.mts"
import type {
  BasicMIDI, SpessaSynthSequencer, SpessaSynthProcessor
} from "spessasynth_core"
import type { Writable } from "node:stream"
import type fs from "node:fs"

/*
  ——— PARAMETERS OBJECTS ———
*/
/** list of promises used by sox/ffmpeg's child processes */
export type promisesOfProgramsType = Promise<void | number>[]
/**
  In file mode it can be a boolean because it can be PCM audio
  so it should use rawReadStream instead
  (isf32le || readStream)
*/
type readStreamType<T> = (
  T extends "fileMode"
    ? NodeJS.ReadableStream | boolean
    : NodeJS.ReadableStream
);
/** General properties for formatManager */
type formatObjectBase<T = unknown> = {
  /** core stream that interacts with spessasynth */
  readStream?: readStreamType<T>, format?: string | true,
  dryRun?: dryRunType,            effects?: effectsListType,
  stdoutHeader?: Uint8Array,      promisesOfPrograms: promisesOfProgramsType,
  [key: string]: any
}
/** Server only properties for formatManager */
interface formatObjectServer extends formatObjectBase {
  res: ServerResponse
}
/** File mode only properties for formatManager */
interface formatObjectFileMode
extends formatObjectBase, Required<Pick<perSongOptions, "fileOutputs">> {
  createNewFileNameAnyway: boolean,
  /** Same as readStream but for PCM-style audio output */
  rawReadStream?: NodeJS.ReadableStream,
  FO_CONSTANTS?: FO_CONSTANTS,
  outFile: string | number[]
}
/**
  General & player mode | file mode
  for formatManager's object parameter
*/
export type formatObjectParameters<T = unknown> =
  | formatObjectBase<T> | formatObjectServer | formatObjectFileMode


/** getSampleCount's object parameter */
export type sampleCountObjectParameters = Pick<
  perSongOptions,
  | "sampleRate" | "hardStop"
  | "loopAmount" | "loopStart"     | "loopEnd"
  | "loopFade"   | "loopFadeStart" | "loopFadeDuration"
> & {
  midi: BasicMIDI
}

export type addEventFunc<T extends NodeJS.Signals | "exit" = NodeJS.Signals> =
  | ((...args: process.ProcessEventMap[T]) => void | never)
  | (() => void | never)

/** Most of initSpessaSynth object properties that can be passed */
type initObjectBaseParam = Pick<
  perSongOptions,
  "midiFile" | "soundfontFile" | "indexOfGroup"
  | Exclude<nonSpecificProperties, "loopFadeInterpolation">
> & {
  /** song's index */
  index: number,
  /** if the BasicMIDI class is required to be returned */
  basicMIDIRequired?: boolean,
  /** return the sample count and do nothing */
  onlySampleCount?: boolean,
  spessasynthLogging: spessasynthLoggingIntfc,
  [key: string]: any
}
/** toFile specific properties */
export interface initObjFileModeParam extends initObjectBaseParam {
  /** return the duration and do nothing */
  onlyDuration?: boolean, isToFile: boolean
}
/** Optional properties | toFile specific ones for initSpessaSynth function */
export type initObjectParameters =
  | initObjectBaseParam | initObjFileModeParam

/** All SoX's available effects */
export type SoxEffectNames = (
  | "allpass"  | "band"     | "bandpass"  | "bandreject"
  | "bass"     | "bend"     | "biquad"    | "chorus"
  | "channels" | "compand"  | "contrast"  | "dcshift"
  | "deemph"   | "delay"    | "input"     | "fade"
  | "earwax"   | "echo"     | "echos"     | "equalizer"
  | "fir"      | "firfit"   | "flanger"   | "gain"
  | "highpass" | "hilbert"  | "ladspa"    | "loudness"
  | "lowpass"  | "mcompand" | "noiseprof" | "noisered"
  | "norm"     | "oops"     | "output"    | "overdrive"
  | "pad"      | "phaser"   | "pitch"     | "rate"
  | "remix"    | "repeat"   | "reverb"    | "reverse"
  | "riaa"     | "silence"  | "sinc"      | "spectrogram"
  | "speed"    | "splice"   | "stat"      | "stats"
  | "stretch"  | "swap"     | "synth"     | "tempo"
  | "treble"   | "tremolo"  | "trim"      | "upsample"
  | "vad"      | "vol"
)
/** List of structured effects (name + optional values) */
export type effectsListType = Array<{effect: SoxEffectNames, values?: string[]}>

export interface effectsObjectParams<T = unknown> {
  /** the process to spawn, sox usually */
  program: "sox",
  /** file header */
  stdoutHeader?: Uint8Array, readStream?: readStreamType<T>,
  /** adds the error event handler to sox's stdin */
  addErrorEventToDest?: (
    ((dest: Writable) => typeof dest)
  ),
  promisesOfPrograms: promisesOfProgramsType,
  stdout?: (
    | NodeJS.WriteStream
    | ChildProcessWithoutNullStreams["stdin"]
    | "pipe" | "ignore"
  ),
  destination?: "-" | string,
  effects?: effectsListType,
  sampleRate?: 48000 | number,
  /** type of raw (pcm) to use */
  rawMode?: string | false,
  /** if it should send EOF after pipe finishes */
  sendEOF?: T extends "stdout" ? boolean : undefined
}

/*
  ——— OPTIONS OBJECTS ———
*/
// keyof prioritise index signatures instead of real keys and
// 'as' makes it possible to get the actual/real keys from K
// (called key remapping)
type BetterOmit<T, P extends keyof T> = {
  [K in keyof T as Exclude<K, P>]: T[K]
}
/** options' properties for toStdoutOptionsObject */
export type basetoStdoutOptionsObject = BetterOmit<
  perSongOptions, fileModeOptionsKeys | serverModeOptionsKeys
>
/** toStdout's object argument */
export interface toStdoutOptionsObject {
  index: number, res?: ServerResponse,
  options: basetoStdoutOptionsObject
}
export interface spessasynthLoggingIntfc {
  info?: boolean, warning?: boolean
}
export interface progressBuffersIntfc {
  amountToRender: SharedArrayBuffer,
  renderedAmount: SharedArrayBuffer,
  percentageDone: SharedArrayBuffer
}

export interface addEventParamIntfc {
  eventType: NodeJS.Signals | toFileSignalNames | "stdoutExit",
  func?: addEventFunc
}
export type toFileSignalNames =
  | "toFileSIGTSTP" | "toFileSIGTERM"
  | "toFileSIGQUIT" |  "toFileSIGINT"
/** options property for toFileObject */
export type toFileOptionsObject = (
  & basetoStdoutOptionsObject
  & Required<Pick<perSongOptions, "fileOutputs">> & {
     [
       key in Exclude<fileModeOptionsKeys, "fileOutputs">
     ]: perSongOptions[key]
  }
)
/** toFile's object argument */
export interface toFileObject {
   options: toFileOptionsObject,
   spessasynthLogging: spessasynthLoggingIntfc,
   createNewFileNameAnyway: boolean,
   index: number,
   progressBuffers: progressBuffersIntfc,
   FO_CONSTANTS: FO_CONSTANTS
}
/** General properties of createReadable's object parameter */
export type createReadableBaseObjParam = Pick<
  perSongOptions,
  "hardStop" | "loopFade" | "loopFadeDuration" | "loopFadeInterpolation"
> & {
   sampleCount: number,
   seq: SpessaSynthSequencer, synth: SpessaSynthProcessor,
   getData: typeof getData,
   isf32le: boolean, startFading?: number,
   [key: string]: any
}
/** File mode version of createReadableBaseObjParam */
export interface createReadableFileModeObjParam extends createReadableBaseObjParam {
   index?: number,
   /** if it should skip updating the progress */
   doNotRepeat: boolean,
   progressBuffers: progressBuffersIntfc
}
/** General | file mode of createReadable's object parameter */
export type createReadableObjectParameters =
  | createReadableBaseObjParam | createReadableFileModeObjParam

/** General properties for preparedDestination's 1st object argument */
type prepDestBaseObjParam = Pick<
  perSongOptions,
  "dryRun" | "sampleRate" | "effects" | "format"
> & {
  isPCM: boolean, midi?: BasicMIDI,
  loadingAnimation?: Deno.ChildProcess | ChildProcess,
  loadingAnimationCleanupFunc?: loadingAnimationCleanupFuncType,
  getWavHeader: typeof getWavHeader | false,
  promisesOfPrograms: promisesOfProgramsType,
  isVerboseLevelSet?: boolean,
  [key: string]: any
}
/** Server version of prepDestBaseObjParam */
interface prepDestServerObjParam extends prepDestBaseObjParam {
  res: ServerResponse, mpv: ChildProcess,
  /** if startPlayer's range header has been used */
  specificRange?: boolean, length: number
}
/** Stdout version of prepDestBaseObjParam */
interface prepDestStdoutObjParam extends prepDestBaseObjParam {
  lengthOfFiles: number[], midiFile?: perSongOptions["midiFile"]
}
/**
  General & player mode | stdout mode
  for preparedDestination function's 1st object parameter
*/
export type prepareDestinationObjParam =
  | prepDestServerObjParam | prepDestStdoutObjParam

/*
  ——— RETURN VALUES ———
*/
export type whereToConnectType = (
  | NodeJS.WritableStream
  | ChildProcessWithoutNullStreams["stdin"]
  | ReturnType<typeof fs.createWriteStream> | typeof process.stdout
)
export type pipingFunction = (
  whereToConnect?: NodeJS.WritableStream, end?: boolean, noPipe?: boolean
) => NodeJS.ReadableStream | void;

export interface ffmpegArgsObj<T> {
  flac: T, mp3: T, opus: T
}
export type basicMIDIRequiredTuple = [sampleCount: number, midi: BasicMIDI]
export interface getSampleCountObj {
  loopDetectedInMidi: boolean,
  durationInSeconds: number,
  sampleCount: number
}
export interface initSpessaSynthObj {
  seq: SpessaSynthSequencer, synth: SpessaSynthProcessor,
  midi: BasicMIDI,
  sampleCount: number, durationInSeconds: number,
  startFading?: number | false
}
/** A tuple for removing values from variables */
export type blackHoleTuple = [] & { [key: string]: void }
type cleanupPromiseType = Promise<
  (Awaited<Promise<blackHoleTuple>> | Awaited<promisesOfProgramsType[0]>)[]
>
export type toStdoutArray = [
  pipingFunction: pipingFunction | undefined,
  cleanupPromiseType
];
export type toFileArray = [
  fileOutputs: Required<NonNullable<perSongOptions["fileOutputs"]>>,
  pipingFunction: (fileModePipingFunction | undefined)[],
  cleanupPromiseType
];
export type preparedDestination =
  | typeof process.stdout | ServerResponse
  | ChildProcess["stdin"] | ChildProcess
  | [res: ServerResponse, stdoutHeader: Uint8Array | undefined]
  | undefined

type maybePrepDestTupleValues = Partial<[
  dryRunStream:   ReturnType<typeof fs.createWriteStream>,
  stdoutHeader:   Uint8Array,
  convertProcess: ChildProcessWithoutNullStreams
]>
export type prepareDestinationReturnValue = [
  ...maybePrepDestTupleValues,
  destination: preparedDestination
] | preparedDestination;

