import {
  parentPort, workerData
} from "worker_threads"
import * as fs from "fs"
import { toFile } from "./mainFunctions.mjs"

global.fs = fs;
process.on("unhandledRejection", i => console.error(i))
/**
 * Runs toFile with the provided data and also
 * sends the fileOutputs array back
 * @param {Object} workerDataObj
 * @param {Object} workerDataObj.progressBuffers
 * @param {Object} workerDataObj.options
 * @param {Number} workerDataObj.index
 * @param {Number} workerDataObj.filesListLength
 */
async function runTask({
  progressBuffers,
  options, index, filesListLength
}) {
  const [fileOutputs, pipingFunctions, promiseToWait] = await toFile({
    createNewFileNameAnyway: (index > 0 || filesListLength > 1),
    progressBuffers,
    index, options
  })
  parentPort.postMessage({index, files: fileOutputs})
  for (const func of pipingFunctions) if (func) func()

  await promiseToWait
  parentPort.postMessage("DONE_RENDERING")
}
parentPort.on("message", async message => await runTask(message))
await runTask(workerData)

