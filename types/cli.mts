import type { ChildProcess } from "node:child_process"

export type doneFileList = { [key: string]: symbol }
/** The main object used for detecting same basename groups */
export type extLessFiles = { [key: string]: number }
export type loadingAnimationCleanupFuncType = (() => void) | undefined;
export type loadingAnimationProcType = ChildProcess | Deno.ChildProcess | undefined

export interface timeStampMatch extends RegExpMatchArray {
  groups: { optional?: string }
}

export interface setFileObjectParameters {
  /** index of the current function inside setFilePromises */
  indexOfSetFile: number,
  /** extensionless filenames object */
  extLessFiles: { [key: string]: number },
  /** last parameter that has been used last time */
  lastParam?: string,
  lastIndex?: string,
  lastAutomaticFile: string,
  /** if the group separator has been used */
  groupSeparator?: boolean,
  /** file path taken from process.argv */
  arg: string
}
export type setFileReturnType = Promise<void> | void

export interface getArgInfosValue {
  number: number,
  lastIndexNumber: number,
  lastIndexString: string
}
export interface manageVerboseOptionsIntfc<T> {
  DEBUG_LEVEL_SPESSO?: T, DEBUG_FILE_SPESSO?: T,
  debugLevelSpessoMsg: T, debugFileSpessoMsg: T
}

export type FO_CONSTANTS = {
  WAV_INDEX:  0, RAW_INDEX: 1,
  FLAC_INDEX: 2, MP3_INDEX: 3, OPUS_INDEX: 4,
  [key: string]: number
}

