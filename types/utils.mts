export type perSongOptions = {
  [key: string]: (number | string)[] | number | boolean
}
export type allOptions = perSongOptions
export interface UnwantedNonZeroErrorExtras {
  exitCode: number, stdout?: Buffer, stderr?: Buffer
}
export interface groupsChecked {
  length: number, [key: number]: boolean | null
}
