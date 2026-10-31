export interface finalFileOutputsIntfc {
  index: number, files: string[], finished?: boolean
}
export type promiseResolve = (value: unknown) => void
export type promiseReject  = (reason?: any)   => void

