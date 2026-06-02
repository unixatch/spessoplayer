/*
  Copyright (C) 2026  unixatch

    it under the terms of the GNU General Public License as published by
    This program is free software: you can redistribute it and/or modify
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
} from "worker_threads"
import * as fs from "fs"

const {verboseLevel, logFilePath} = workerData;
global.logThis = {verboseLevel, logFilePath};
const { toFile } = await import("./mainFunctions.mjs")
global.fs = fs;
process.on("unhandledRejection", console.error)

let processToClose;
/**
 * Runs toFile with the provided data and also
 * sends the fileOutputs array back
 * @param {Object} workerDataObj
 * @param {Object} workerDataObj.progressBuffers
 * @param {Object} workerDataObj.options
 * @param {Object} workerDataObj.FO_CONSTANTS
 * @param {Number} workerDataObj.index
 * @param {Number} workerDataObj.filesListLength
 * @param {Boolean} workerDataObj.spessasynthLogging
 */
async function runTask({
  progressBuffers, options,
  FO_CONSTANTS, index, filesListLength,
  spessasynthLogging
}) {
  processToClose?.stdin?.end()

  const toFileValue = await toFile({
    spessasynthLogging,
    createNewFileNameAnyway: (index > 0 || filesListLength > 1),
    progressBuffers,
    index, options, FO_CONSTANTS
  });
  if (toFileValue === null) return parentPort.postMessage("FAILED_INITIALIZATION")

  const [fileOutputs, pipingFunctions, promiseToWait] = toFileValue;
  parentPort.postMessage({index, files: fileOutputs})
  for (const func of pipingFunctions) {
    const returnValue = func?.();
    if (returnValue?.needToEndStdin) processToClose = returnValue;
  }

  await promiseToWait
  parentPort.postMessage("DONE_RENDERING")
}
parentPort.on("message", async message => await runTask(message))
await runTask(workerData)

