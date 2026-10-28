/**
 * @module typeDefinitions
 */

import type { ServerResponse } from "node:http"
import type { FO_CONSTANTS } from "./cli.mts"
import type { getData } from "../wavFunctions.mts"
import type {
  BasicMIDI, SpessaSynthSequencer, SpessaSynthProcessor
} from "spessasynth_core"

/*
  ——— PARAMETERS OBJECTS ———
*/
/** General */
export interface formatObject {
  format?: boolean | string,
  readStream?: NodeJS.ReadableStream, rawReadStream?: NodeJS.ReadableStream,
  dryRun?: string, effects?: object,
  index?: number, stdoutHeader?: Uint8Array,
  promisesOfPrograms: Promise<void>[]
}
/** player mode */
interface formatObjectPlayer extends formatObject {
  res: ServerResponse
}
/** file mode */
export interface formatObjectFileMode extends formatObject {
  createNewFileNameAnyway: boolean,
  fileOutputs: string[], FO_CONSTANTS: FO_CONSTANTS,
  outFile: string
}
export type formatObjectParameters = (
  formatObject | formatObjectPlayer | formatObjectFileMode
);

export interface sampleCountObjectParameters {
  midi: BasicMIDI, sampleRate: number,
  loopAmount?: number, loopStart?: number, loopEnd?: number,
  /** if it should not smooth out the end */
  hardStop?: boolean,
  loopFade?: number, loopFadeStart?: number, loopFadeDuration?: number
}

export interface initObjectParameters {
  loopAmount?: number,
  volume?: number, drumsVolume?: number,
  /** A list volumes per channel */
  channelVolume?: number[],
  midiFile: string, soundfontFile: string,
  sampleRate?: number,
  /** if it uses an external program or a builtin */
  externalEffects?: boolean, reverbVolume: number,
  loopStart: number | string,
  loopEnd: number | string,
  loopFade?: boolean,
  loopFadeStart?: number, loopFadeDuration?: number,
  index: number,
  /** index of the Set/group the song is in */
  indexOfGroup: number,
  isToFile?: boolean,
  /** if the BasicMIDI class is required to be returned */
  basicMIDIRequired?: boolean,
  /** return the sample count and do nothing */
  onlySampleCount?: boolean,
  /** return the duration and do nothing */
  onlyDuration?: boolean,
  spessasynthLogging: { info: boolean, warning: boolean }
  /** if it should not smooth out the end */
  hardStop?: boolean
}

export interface effectsObjectParams {
  /** the process to spawn, sox usually */
  program: string,
  /** file header */
  stdoutHeader: Uint8Array, readStream?: NodeJS.ReadableStream,
  /** adds the error event handler to sox's stdin */
  addErrorEventToDest: Function,
  promisesOfPrograms: Promise<unknown>[],
  stdout?: NodeJS.WriteStream | string, destination?: string,
  effects?: Array<{effect: string, values?: string[]}>,
  sampleRate?: number,
  /** type of raw (pcm) to use */
  rawMode?: string,
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
   midiFile: string, soundfontFile: string,
   effects?: object[],
}
interface toFileOptionsObject extends basetoStdoutOptionsObject {
   fileOutputs: string[]
}
export interface toStdoutOptionsObject {
  index: number, res: ServerResponse,
  options: basetoStdoutOptionsObject
}
export interface spessasynthLoggingIntfc {
  info: boolean, warn: boolean
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

/*
  ——— RETURN VALUES ———
*/
export type pipingFunction = (
  whereToConnect: NodeJS.WritableStream, end: boolean, noPipe: boolean
) => NodeJS.ReadableStream | void;

export interface ffmpegArgsObj<T> {
  flac: T, mp3: T, opus: T
}
export interface getSampleCountObj {
  loopDetectedInMidi: boolean,
  durationInSeconds: number,
  sampleCount: number
}
export interface initSpessaSynthObj {
  seq: SpessaSynthSequencer, synth: SpessaSynthProcessor,
  midi: BasicMIDI,
  sampleCount: number, durationInSeconds: number
}
export type toStdoutArray = [
  pipingFunction: Function | undefined,
  Promise<Array<undefined | number>>
];
export type toFileArray = [
  fileOutputs: string[],
  pipingFunction: Function[],
  Promise<Array<Promise<Array<undefined | NodeJS.ReadableStream>> | undefined | number>>
];

