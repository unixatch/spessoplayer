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
 * @param {Object} progressBuffers
 * @param {Object} options
 * @param {Number} index
 * @param {Number} filesListLength
 */
async function runTask({
  amountOfSongs, progressBuffers,
  options, index, filesListLength
}) {
  const [fileOutputs, pipingFunctions, promiseToWait] = await toFile({
    createNewFileNameAnyway: (index > 0 || filesListLength > 1),
    amountOfSongs, progressBuffers,
    parentPort, index,
    ...options
  })
  parentPort.postMessage(fileOutputs)
  for (const func of pipingFunctions) if (func) func()

  await promiseToWait
  parentPort.postMessage("DONE_RENDERING")
}
parentPort.on("message", async message => await runTask(message))
await runTask(workerData)

