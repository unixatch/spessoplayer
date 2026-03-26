#!/usr/bin/env node
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

/**
 * @module main
 */

import { log, clearLastLines } from "./utils/utils.mjs"
import {
  initSpessaSynth,
  applyEffects,
  addEvent,
  toStdout,
  toFile,
  Progress,
  startPlayer
} from "./mainFunctions.mjs"

addEvent({ eventType: "SIGINT" })
process.on("unhandledRejection", i => console.error(i))
log(1, performance.now().toFixed(2), "Added SIGINT event")
// In case the user passes some arguments
const {
  actUpOnPassedArgs,
  Options
} = await import("./cli.mjs");
log(1, performance.now().toFixed(2), "Checking passed args...")
await actUpOnPassedArgs(process.argv)
const listOfOptions = Options.all;

if (listOfOptions?.confirmation) {
  const infos = Options.getConfirmationTable();
  if (listOfOptions?.noTable) {
    for (const i of infos) console.log(i)
  } else console.table(Options.getConfirmationTable())

  const readline = await import("readline/promises");
  async function question() {
    let answer;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    answer = await rl.question("Is this setup correct [Y|n]? ");
    rl.close()

    if (/^(?:y|yes)$/i.test(answer) || /^\s*$/.test(answer)) return;
    if (/^(?:n|no)$/i.test(answer)) {
      console.warn(`${gray}Closing then...${normal}`)
      process.exit()
    }
    clearLastLines([0, -1])
    return await question();
  }
  await question()
}
if (listOfOptions?.toStdout) {
  const filesList = listOfOptions.files,
        lengthOfFiles = [],
        promisesOfPrograms = [],
        { getWavHeader } = await import("./audioBuffer.mjs");
  const amountOfSongs = Options.amountOfSongs;
  for (let i = 0; i < amountOfSongs; i++) {
    const options = Options.getOptionsOfSong(i);
    if (!options) continue;
    const length = await initSpessaSynth({
      index: i, ...options,
      onlySampleCount: true
    });
    lengthOfFiles.push(length)
  }

  let effectsProcess,
      converterProcess;
  // Creating the header
  const sumOfLengths = (index, previous) => index + previous;
  const stdoutHeader = getWavHeader({
    length: lengthOfFiles.reduce(sumOfLengths),
    numChannels: 2
  }, listOfOptions?.sampleRate ?? 48000);

  // If it needs to be converted
  const needsConvertion = listOfOptions?.format?.match(/(?:wave|pcm|s16le|s32le)/) === null;
  if (needsConvertion) {
    if (!spawn) ({ spawn } = await import("child_process"));
    converterProcess = spawn("ffmpeg",
      ffmpegArgs()[listOfOptions?.format],
      {stdio: ["pipe", process.stdout, "pipe"]}
    );
  }
  // If it needs effects
  if (listOfOptions?.effects
      && (listOfOptions?.format?.match(/(?:pcm|s16le|s32le)/) === null
      || !listOfOptions?.format)) {
    [effectsProcess] = await applyEffects({
      program: "sox",
      stdoutHeader,
      stdout: (converterProcess) ? converterProcess.stdin : undefined,
      promisesOfPrograms,
      // TODO: effects system needs to overhauled
      //effects: listOfOptions?.effects[0]
    });
    log(1, performance.now().toFixed(2), "Done setting up SoX")
  } else if (needsConvertion) {
    // Or just a convertion/normal processing
    converterProcess.stdin.write(stdoutHeader)
  }
  log(1, performance.now().toFixed(2), "Created header file ", stdoutHeader)

  let destination;
  // When SoX exists
  if (effectsProcess) {
    destination = effectsProcess.stdin;
  }
  // When only ffmpeg exists
  if (converterProcess && !effectsProcess) {
    destination = converterProcess.stdin;
  }
  // When neither of child_processes exist
  if (!effectsProcess && !converterProcess) {
    process.stdout.write(stdoutHeader)
    destination = process.stdout;
  }
  for (let i = 0; i < amountOfSongs; i++) {
    const options = Options.getOptionsOfSong(i);
    if (!options) continue;
    const [ func, promise ] = await toStdout({ index: i, options });

    if (func) func(destination, i === amountOfSongs-1)
    await promise
  }
  await Promise.all(promisesOfPrograms)
  process.exit()
}
if (listOfOptions?.fileOutputs?.length > 0) {
  addEvent({ eventType: "renderTexts" })
  const filesListLength = listOfOptions.files.length,
        amountOfSongs = Options.amountOfSongs,
        finalFileOutputs = [],
        listOfPromises = new Map();
  const { Worker } = await import("worker_threads"),
        { availableParallelism } = await import("os"),
        maxThreads = availableParallelism() * 2,
        workers = [];
  const progressBuffers = {
          amountToRender: new SharedArrayBuffer(4),
          renderedAmount: new SharedArrayBuffer(4 * amountOfSongs),
          percentageDone: new SharedArrayBuffer(4 * amountOfSongs)
        },
        progress = new Progress(amountOfSongs, undefined, progressBuffers);
  let fileOutputs;

  for (let i = 0; i < amountOfSongs; i++) {
    const options = Options.getOptionsOfSong(i);
    if (fileOutputs) options.fileOutputs = fileOutputs;

    // Waits for all workers to finish
    // if the max of available threads
    // at once has been reached
    const currentThread = i % maxThreads;
    if (i !== 0 && !(currentThread)) await Promise.all(listOfPromises.values())

    const workerDataObject = {
      amountOfSongs, progressBuffers,
      options, index: i, filesListLength
    };
    workers[currentThread] ??= new Worker("./fileWriter_worker.mjs", { workerData: { ...workerDataObject } });

    listOfPromises.set(currentThread, (
      new Promise((resolve, reject) => {
        const hasErrorEvent = workers[currentThread].listeners("error");
        const hasExitEvent = workers[currentThread].listeners("exit");
        if (!hasErrorEvent.length) workers[currentThread].on("error", error => reject(error))
        if (!hasExitEvent.length) workers[currentThread].on("exit", () => resolve())

        workers[currentThread].on("message", (message) => {
          if (message === "DONE_RENDERING") {
            workers[currentThread].removeAllListeners("message")
            return resolve();
          }
          if (Array.isArray(message)) {
            finalFileOutputs.push(...message)
            return;
          }
          process.stdout.emit("renderTexts", progress)
        })
      })
    ))
    if (i >= maxThreads) workers[currentThread].postMessage(workerDataObject)
  }
  await Promise.all(listOfPromises.values())
  // Close workers before continuing
  // otherwise it gets stuck
  for (const worker of workers) worker.terminate()
  console.log("Written", finalFileOutputs.filter(ifil => ifil));
  // Required because some child_processes sometimes blocks node from exiting
  process.exit()
}
await startPlayer(Options)

