/*
  Copyright (C) 2026  unixatch

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with spessoplayer.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
  parentPort, workerData
} from "node:worker_threads"
import * as fs from "node:fs"

import type { FO_CONSTANTS } from "./cli.mts"
import type {
  progressBuffersIntfc, toFileOptionsObject,
  spessasynthLoggingIntfc
} from "./types/mainFunctions.mts"

if (!parentPort) throw new Error("Can't use this file directly")

const {verboseLevel, logFilePath} = workerData;
global.logThis = {verboseLevel, logFilePath};
const { toFile } = await import("./mainFunctions.mts")
global.fs = fs;
process.on("unhandledRejection", console.error)

interface runTask {
  progressBuffers: progressBuffersIntfc, options: toFileOptionsObject,
  FO_CONSTANTS: typeof FO_CONSTANTS,
  index: number, filesListLength: number,
  spessasynthLogging: spessasynthLoggingIntfc
}
/**
 * Runs toFile with the provided data and also
 * sends the fileOutputs array back
 */
async function runTask({
  progressBuffers, options,
  FO_CONSTANTS, index, filesListLength,
  spessasynthLogging
}: runTask): Promise<void> {
  const toFileValue = await toFile({
    spessasynthLogging,
    createNewFileNameAnyway: (index > 0 || filesListLength > 1),
    progressBuffers,
    index, options, FO_CONSTANTS
  });
  if (toFileValue === null) return parentPort!.postMessage("FAILED_INITIALIZATION")

  const [fileOutputs, pipingFunctions, promiseToWait] = toFileValue;
  parentPort!.postMessage({index, files: fileOutputs})
  for (const func of pipingFunctions) func?.();

  await promiseToWait
  parentPort!.postMessage("DONE_RENDERING")
}
parentPort.on("message", async message => await runTask(message))
await runTask(workerData)

