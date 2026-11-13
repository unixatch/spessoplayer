import type { allOptions } from "./utils.mts"
import type { effectsListType } from "./mainFunctions.mts"

import type { ChildProcessWithoutNullStreams } from "node:child_process"

export interface finalFileOutputsIntfc {
  index: number, files: string[], finished?: boolean
}
export type promiseResolve = (value: unknown) => void
export type promiseReject  = (reason?: any)   => void;

export type listOfOptionsType = Pick<allOptions,
  | "files"        | "dryRun"
  | "confirmation" | "noTable"    | "format"
  | "songIndex"    | "toStdout"   | "fileOutputs"
  | "effects"      | "showUsage"  | "progressDelay"
  | "noProgress"   | "maxThreads"
>
export interface effectParameterObjectIntfc {
  readonly program: string,
  readonly promisesOfPrograms: Promise<void>[],
  sendEOF: boolean,
  readonly stdout: (
    | NodeJS.WriteStream
    | ChildProcessWithoutNullStreams["stdin"]
    | undefined
  ),
  stdoutHeader: Uint8Array | undefined,
  rawMode: string | false, effects: effectsListType
}

