import {
  parentPort, workerData
} from "worker_threads"
import * as fs from "fs"

const {verboseLevel, logFilePath} = workerData;
global.logThis = {verboseLevel, logFilePath};
const { toFile } = await import("./mainFunctions.mjs")
global.fs = fs;
process.on("unhandledRejection", i => console.error(i))

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
 */
async function runTask({
  progressBuffers, options,
  FO_CONSTANTS, index, filesListLength
}) {
  processToClose?.stdin?.end()

  const toFileValue = await toFile({
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

