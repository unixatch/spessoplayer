/**
 * @module typeDefinitions
 */

import type { Readable } from "node:stream"
import type { ServerResponse } from "node:http"
import type { ChildProcess } from "node:child_process"
import type { FO_CONSTANTS } from "./cli.mts"
import type {
  BasicMIDI,
  SpessaSynthSequencer, SpessaSynthProcessor
} from "spessasynth_core"

/*
  ——— PARAMETERS OBJECTS ———
*/
export interface formatObjectParameters {
  format?: boolean | string,
  readStream?: Readable, rawReadStream?: Readable,
  res?: ServerResponse,
  dryRun?: string, effects?: object,
  index: number, createNewFileNameAnyway?: boolean,
  fileOutputs?: string[], FO_CONSTANTS: FO_CONSTANTS,
  stdoutHeader?: Uint8Array,
  promisesOfPrograms: Promise<void>[], outFile?: string
}

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
  stdoutHeader: Uint8Array, readStream?: Readable,
  /** adds the error event handler to sox's stdin */
  addErrorEventToDest: Function,
  promisesOfPrograms: Promise<void>[],
  stdout?: NodeJS.WriteStream | string, destination?: string,
  effects?: object[],
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
   sampleRate?: number,
   volume?: number,
   format?: string, // file format
   midiFile: string, soundfontFile: string,
   effects?: object[],
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
export interface toFileOptionsObject extends basetoStdoutOptionsObject {
   fileOutputs: string[],
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
   getData,
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
export declare function createReadable(
  Readable: Readable, isStdout: boolean,
  {}: createReadableObjectParameters
): Readable;

/*
  ——— RETURN VALUES ———
*/
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
  Promise<Array<Promise<Array<undefined | Readable>> | undefined | number>>
];

