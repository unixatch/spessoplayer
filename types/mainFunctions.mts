/**
 * @module typeDefinitions
 */

import type { ServerResponse } from "node:http"
import type { ChildProcess, ChildProcessWithoutNullStreams } from "node:child_process"
import type { getWavHeader, getData } from "../wavFunctions.mts"
import type {
  FO_CONSTANTS, loadingAnimationCleanupFuncType
} from "./cli.mts"
import type { perSongOptions, nonSpecificProperties } from "./utils.mts"
import type {
  BasicMIDI, SpessaSynthSequencer, SpessaSynthProcessor
} from "spessasynth_core"
import type fs from "node:fs"

/*
  ——— PARAMETERS OBJECTS ———
*/
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
  dryRun?: string,                effects?: effectsListType,
  stdoutHeader?: Uint8Array,      promisesOfPrograms: promisesOfProgramsType,
  [key: string]: any
}
/** Server only properties for formatManager */
interface formatObjectServer extends formatObjectBase {
  res: ServerResponse
}
/** File mode only properties for formatManager */
interface formatObjectFileMode extends formatObjectBase {
  createNewFileNameAnyway: boolean,
  /** Same as readStream but for PCM-style audio output */
  rawReadStream?: NodeJS.ReadableStream,
  fileOutputs: string[], FO_CONSTANTS?: FO_CONSTANTS,
  outFile: string | number[]
}
/** General & player mode | file mode */
export type formatObjectParameters<T = unknown> =
  | formatObjectBase<T> | formatObjectServer | formatObjectFileMode


export interface sampleCountObjectParameters {
  midi: BasicMIDI, sampleRate: number,
  loopAmount?: number, loopStart?: number, loopEnd?: number,
  /** if it should not smooth out the end */
  hardStop?: boolean,
  loopFade?: boolean, loopFadeStart?: number, loopFadeDuration?: number
}

export type addEventFunc<T extends NodeJS.Signals | "exit" = NodeJS.Signals> =
  | ((...args: process.ProcessEventMap[T]) => void | never)
  | (() => void | never)

export interface initObjectParameters
extends Pick<
  perSongOptions,
  "midiFile" | "soundfontFile" | "indexOfGroup"
  | Exclude<nonSpecificProperties, "loopFadeInterpolation">
> {
  index: number,
  isToFile?: boolean,
  /** if the BasicMIDI class is required to be returned */
  basicMIDIRequired?: boolean,
  /** return the sample count and do nothing */
  onlySampleCount?: boolean,
  /** return the duration and do nothing */
  onlyDuration?: boolean,
  spessasynthLogging: spessasynthLoggingIntfc
}

export type effectsListType = Array<{effect: string, values?: string[]}>
export interface effectsObjectParams<T = unknown> {
  /** the process to spawn, sox usually */
  program: string,
  /** file header */
  stdoutHeader?: Uint8Array, readStream?: readStreamType<T>,
  /** adds the error event handler to sox's stdin */
  addErrorEventToDest?: Function,
  promisesOfPrograms: promisesOfProgramsType,
  stdout?: (
    | NodeJS.WriteStream
    | ChildProcessWithoutNullStreams["stdin"]
    | string
  ),
  destination?: string,
  effects?: effectsListType,
  sampleRate?: number,
  /** type of raw (pcm) to use */
  rawMode?: string | false,
  /** if it should send EOF after pipe finishes */
  sendEOF?: boolean
}

/*
  ——— OPTIONS OBJECTS ———
*/
export interface basetoStdoutOptionsObject {
   loopAmount?: number,
   loopStart?: number, loopEnd?: number,
   sampleRate?: number, hardStop?: boolean,
   loopFade?: boolean, loopFadeDuration?: number,
   loopFadeInterpolation?: string | number,
   volume?: number,
   format?: string, // file format
   midiFile: string, soundfontFile: string | SharedArrayBuffer,
   effects?: effectsListType
}
export interface toFileOptionsObject extends basetoStdoutOptionsObject {
   fileOutputs: string[]
}
export interface toStdoutOptionsObject {
  index: number, res: ServerResponse,
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
export interface toFileObject extends basetoStdoutOptionsObject {
   options: toFileOptionsObject,
   spessasynthLogging: spessasynthLoggingIntfc,
   createNewFileNameAnyway: boolean,
   index: number,
   progressBuffers: progressBuffersIntfc,
   FO_CONSTANTS: FO_CONSTANTS
}
export interface createReadableObjectParameters {
   sampleCount: number,
   index?: number,
   seq: SpessaSynthSequencer, synth: SpessaSynthProcessor,
   getData: typeof getData,
   isf32le: boolean,
   /** if it should skip updating the progress */
   doNotRepeat: boolean,
   hardStop?: boolean,
   /** if it should do 1 last loop and after some time, fade away slowly */
   loopFade?: boolean,
   loopFadeDuration?: number,
   loopFadeInterpolation?: string,
   startFading?: number,
   progressBuffers: progressBuffersIntfc
}

export interface prepareDestinationObjParam {
  isVerboseLevelSet?: boolean, isPCM: boolean,
  res?: ServerResponse, mpv?: ChildProcess, midi?: BasicMIDI,
  loadingAnimation?: Deno.ChildProcess | ChildProcess,
  loadingAnimationCleanupFunc?: loadingAnimationCleanupFuncType,
  dryRun?: string, length?: number, lengthOfFiles?: number[],
  getWavHeader: typeof getWavHeader | false, midiFile?: string,
  sampleRate?: number, format?: string,
  promisesOfPrograms: promisesOfProgramsType,
  effects?: effectsListType,
  /** if startPlayer's range header has been used */
  specificRange?: boolean
}

/*
  ——— RETURN VALUES ———
*/
export type pipingFunction = (
  whereToConnect: NodeJS.WritableStream, end: boolean, noPipe?: boolean
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
export type toStdoutArray = [
  pipingFunction: pipingFunction | undefined,
  Promise<Array<undefined | number>>
];
export type toFileArray = [
  fileOutputs: string[],
  pipingFunction: (pipingFunction | undefined)[],
  Promise<Array<Promise<Array<undefined | NodeJS.ReadableStream>> | undefined | number>>
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

