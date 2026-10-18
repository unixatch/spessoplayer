export interface lastIndexGroupObject {
  /** last index that has been set last time */
  index?: string
}
export type doneFileList = { [key: string]: symbol }
export type extLessFiles = { [key: string]: number }

export interface setFileObjectParameters {
  /** index of the current function inside setFilePromises */
  indexOfSetFile: number,
  /** extensionless filenames object */
  extLessFiles: { [key: string]: number },
  /** last parameter that has been used last time */
  lastParam: string,
  lastIndex: lastIndexGroupObject,
  lastAutomaticFile: string,
  /** if the group separator has been used */
  groupSeparator: boolean,
  /** file path taken from process.argv */
  arg: string
}
export interface getArgInfosValue {
  number: number,
  lastIndexNumber: number,
  lastIndexString: lastIndexGroupObject | string
}
export enum FO_CONSTANTS {
  WAV_INDEX  = 0, RAW_INDEX = 1,
  FLAC_INDEX = 2, MP3_INDEX = 3, OPUS_INDEX = 4
}

