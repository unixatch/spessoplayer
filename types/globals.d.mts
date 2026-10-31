export declare global {
  var logThis: { verboseLevel?: number, logFilePath?: string } | undefined
  var SIGINT: boolean
  var fs: Awaited<typeof import("node:fs")>

  // Custom formatting
  const normal: string
  const bold: string
  const endBold: string
  const italics: string
  const endItalics: string
  const underline: string
  const endUnderline: string
  // Actual colors
  const yellow: string
  const normalYellow: string
  const magenta: string
  const cyan: string
  const brightMagenta: string
  const dimYellow: string
  const green: string
  const dimGreen: string
  const normalRed: string
  const red: string
  const dimRed: string
  const gray: string
  const dimGray: string
  const dimGrayBold: string
}

