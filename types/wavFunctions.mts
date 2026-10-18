/** Describes audio data */
export interface getWavHeaderObjectParameters {
  length: number, numChannels: number
}
export interface wavMetadata<T> {
  tracksAmount?: T, timeDivision?: T, tempoChanges?: T,
  artist?: T, title?: T, album?: T, genre?: T
}
export declare function getWavHeader(
  {}: getWavHeaderObjectParameters,
  sampleRate: number, metadata?: wavMetadata<string>
): Uint8Array;
export declare function getData(audioData: Float32Array[]): Uint8Array;

