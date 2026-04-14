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

/**
 * @module cli
 */

import { join, basename, parse } from "path"
import { log, Options } from "./utils/utils.mjs"

/** @type {(Promise<String[]>|String[])} */
let argvWithoutFileExts = new Promise(resolve => {
  const newArguments = [...new Set(process.argv.slice(2)).values()],
        newArgumentsLength = newArguments.length;
  for (let i = 0; i < newArgumentsLength; i++) {
    const parsedElement = parse(newArguments[i]);
    newArguments[i] = join(parsedElement.dir, parsedElement.name);
  }
  resolve(newArguments)
});
const regexes = {
  help: /^(?:--help|\/help|-h|\/h|\/\?)$/,
  version: /^(?:--version|\/version|-V|\/V)$/,
  uninstall: /^(?:--uninstall|\/uninstall|-u|\/u)$/,

  verboseLevel: new RegExp([
    "^(?:--verbose(?:=(?<number>\\d))*", // --verbose[=n]
    "|\\/verbose(?:=(?<number>\\d))*",   // /verbose[=n]
    "|-v(?:=(?<number>\\d))*",           // -v[=n]
    "|\\/v(?:=(?<number>\\d))*)$"        // /v[=n]
  ].join("")),

  logFile: new RegExp([
    "^(?:--log-file(?:=(?<path>\\w+))*", // --log-file[=n]
    "|\\/log-file(?:=(?<path>\\w+))*",   // /log-file[=n]
    "|-lf(?:=(?<path>\\w+))*",           // -lf[=n]
    "|\\/lf(?:=(?<path>\\w+))*)$"        // /lf[=n]
  ].join("")),
  ask: /^(?:--ask|\/ask|--confirm|\/confirm|-a|\/a|-c|\/c)$/,
  noTable: /^(?:--no-table|\/no-table|-nt|\/nt)$/,
  dryRun: new RegExp([
    "^(?:--dry-run|\/dry-run",
    "|--test|\/test",
    "|--null|\/null",
    "|-dr|\/dr",
    "|-t|\/t",
    "|-0|\/0)$"
  ].join("")),
  maxThreads: new RegExp([
    "^(?:--max-threads|\/max-threads",
    "|--threads|\/threads",
    "|-mt|\/mt",
    "|-T|\/T)$"
  ].join("")),

  stdout: /^-$/,
  wav: /^.*(?:\.wav|\.wave)$/,
  wavFormat: /^(?:wav|wave)$/,
  flac: /^.*\.flac$/,
  mp3: /^.*\.mp3$/,
  raw: /^.*\.(?:s16le|s32le|pcm)$/,
  rawFormat: /^(?:s16le|s32le|pcm)$/,

  input: new RegExp([
    "^(?:--input(?<index>\\d+)*",
    "|\\/input(?<index>\\d+)*",
    "|-i(?<index>\\d+)*",
    "|\\/i(?<index>\\d+)*)$"
  ].join("")),
  reverbVolume: new RegExp([
    "^(?:--reverb-volume(?<index>\\d+)*",
    "|\\/reverb-volume(?<index>\\d+)*",
    "|-rvb(?<index>\\d+)*",
    "|\\/rvb(?<index>\\d+)*)$"
  ].join("")),
  effects: new RegExp([
    "^(?:--effects(?<index>\\d+)*",
    "|\\/effects(?<index>\\d+)*",
    "|-e(?<index>\\d+)*",
    "|\\/e(?<index>\\d+)*)$"
  ].join("")),

  // stdout format must be of only 1 kind
  // otherwise players like mpv won't read the output correctly
  format: /^(?:--format|\/format|-f|\/f)$/,
  volume: new RegExp([
    "^(?:--volume(?<index>\\d+)*",
    "|\\/volume(?<index>\\d+)*",
    "|-vol(?<index>\\d+)*",
    "|\\/vol(?<index>\\d+)*)$"
  ].join("")),
  sampleRate: new RegExp([
    "^(?:--sample-rate(?<index>\\d+)*",
    "|\\/sample-rate(?<index>\\d+)*",
    "|-r(?<index>\\d+)*",
    "|\\/r(?<index>\\d+)*)$"
  ].join("")),

  loop: new RegExp([
    "^(?:--loop(?<index>\\d+)*",
    "|\\/loop(?<index>\\d+)*",
    "|-l(?<index>\\d+)*",
    "|\\/l(?<index>\\d+)*)$"
  ].join("")),
  loopStart: new RegExp([
    "^(?:--loop-start(?<index>\\d+)*",
    "|\\/loop-start(?<index>\\d+)*",
    "|-ls(?<index>\\d+)*",
    "|\\/ls(?<index>\\d+)*)$"
  ].join("")),
  loopEnd: new RegExp([
    "^(?:--loop-end(?<index>\\d+)*",
    "|\\/loop-end(?<index>\\d+)*",
    "|-le(?<index>\\d+)*",
    "|\\/le(?<index>\\d+)*)$"
  ].join("")),

  infinity: /^(?:Infinity|infinity)$/,
  //                          HH:MM:SS.sss
  ISOTimestamp: /[0-9]{1,2}:[0-9]{2}:[0-9]{2}(\.[0-9])*/,
  areDecibels: /^(?:-|\+*)[\d.]+dB/,
  decibelNumber: /^((?:-|\+*)[\d.]+)dB/,
  isPercentage: /^[\d.]+%$/,
  percentageNumber: /^([\d.]+)%$/
};
const testFunctions = {
  help: i => regexes.help.test(i),
  stdout: i => regexes.stdout.test(i),
  version: i => regexes.version.test(i),
  uninstall: i => regexes.uninstall.test(i),
  verboseLevel: i => regexes.verboseLevel.test(i),
  logFile: i => regexes.logFile.test(i)
};

/**
 * Retrieves the first 20 bytes of a file
 * @param {String} path path of file
 * @return {Promise<String>} - first 20 bytes of file
 */
async function get20BytesFromFile(path) {
  const {
    promise: readPromise,
    resolve, reject
  } = Promise.withResolvers();

  fs.createReadStream(path, { start: 0, end: 20 })
    .on("data", resolve)
    .on("error", ({code, message, errno}) => {
      let messageToPrint;
      switch (code) {
        case "EACCES":
          messageToPrint = `${red}Can't open '${path}' because permissions aren't enough${normal}`;
          break;
        case "EISDIR":
          messageToPrint = `${red}Can't read a directory${normal}`;
          break;
        case "ENOENT":
          messageToPrint = `${red}Can't open '${path}' because it doesn't exist${normal}`;
          break;
        case "EPERM":
          messageToPrint = `${red}Can't read '${path}' because it requires elevated permissions to do so${normal}`;
          break;

        default:
          messageToPrint = `${red}Quitting because ${underline+message+normal}`;
      }
      console.error(messageToPrint)
      reject(process.exit(errno))
    })
  return (await readPromise)?.toString();
}
const setFilePromises = [];
/**
 * Sets necessary variables in Options class for main.mjs
 * @param {String[]} args - The process.argv to analyse
 * @throws {ReferenceError} - if the next argument doesn't exist
 */
const actUpOnPassedArgs = async (args) => {
  let lastParam,
      lastIndex;
  let newArguments = args.slice(2);
  const newArgumentsSet = new Set(newArguments),
        noDuplicates = [...newArgumentsSet.values()],
        /** @type {Map<String, (String|Symbol)>} */
        doneFileList = new Map(newArgumentsSet.entries()),
        doneSymbol = Symbol("ALREADY_DONE");
  if (newArguments.length === 0) {
    await help()
    process.exit()
  }
  if (newArguments.find(testFunctions.help)) {
    await help()
    process.exit()
  }
  if (newArguments.find(testFunctions.version)) {
    await version()
    process.exit()
  }
  if (newArguments.find(testFunctions.uninstall)) {
    await uninstall()
    process.exit()
  }

  const isVerboseLevelSet = newArguments.find(testFunctions.verboseLevel);
  if (isVerboseLevelSet) {
    let verboseOptionNumber = isVerboseLevelSet.match(regexes.verboseLevel).groups.number;
    const verboseOptionPosition = newArguments.indexOf(isVerboseLevelSet);

    if (!verboseOptionNumber) verboseOptionNumber = "1";
    // Delete verbose-level from newArguments
    newArguments.splice(verboseOptionPosition, 1)

    if (!process.env["DEBUG_LEVEL_SPESSO"]) {
      await setVerboseLevel(verboseOptionNumber)
    } else log(1, performance.now().toFixed(2), `Using variable DEBUG_LEVEL_SPESSO=${process.env["DEBUG_LEVEL_SPESSO"]}`)
  } else if (process.env["DEBUG_LEVEL_SPESSO"]) {
    log(1, performance.now().toFixed(2), `Using variable DEBUG_LEVEL_SPESSO=${process.env["DEBUG_LEVEL_SPESSO"]}`)
  }
  const isPathOfLogFileSet = newArguments.find(testFunctions.logFile);
  if (isPathOfLogFileSet
      && !isVerboseLevelSet
      && !process.env["DEBUG_LEVEL_SPESSO"]) {
    await setVerboseLevel("1")
  }

  if (isPathOfLogFileSet) {
    const pathOfLogFile = isPathOfLogFileSet.match(regexes.logFile).groups.path;
    const pathOfLogFilePosition = newArguments.indexOf(isPathOfLogFileSet);

    // Delete verbose-level from newArguments
    newArguments.splice(pathOfLogFilePosition, 1)

    if (!process.env["DEBUG_FILE_SPESSO"]) {
      setLogFilePath(pathOfLogFile)
    } else log(1, performance.now().toFixed(2), `Using variable DEBUG_FILE_SPESSO=${process.env["DEBUG_FILE_SPESSO"]}`)
  } else if (process.env["DEBUG_FILE_SPESSO"]) {
    log(1, performance.now().toFixed(2), `Using variable DEBUG_FILE_SPESSO=${process.env["DEBUG_FILE_SPESSO"]}`)
  }

  function clearLastVariables() {
    lastParam = undefined,
    lastIndex = undefined;
  }
  let indexOfSetFile = 0,
      lastAutomaticFile;
  for (const arg of newArguments) {
    switch (arg) {
      case regexes.wav.test(arg) && arg: {
        Options.fileOutputs(0, arg);
        log(1, performance.now().toFixed(2), "Set file output to wav")
        break;
      }
      case regexes.flac.test(arg) && arg: {
        Options.fileOutputs(1, arg);
        log(1, performance.now().toFixed(2), "Set file output to flac")
        break;
      }
      case regexes.mp3.test(arg) && arg: {
        Options.fileOutputs(2, arg);
        log(1, performance.now().toFixed(2), "Set file output to mp3")
        break;
      }
      case regexes.raw.test(arg) && arg: {
        Options.fileOutputs(3, arg);
        log(1, performance.now().toFixed(2), "Set file output to pcm")
        break;
      }
      case regexes.stdout.test(arg) && arg: {
        Options.toStdout = true;
        break;
      }
      case regexes.ask.test(arg) && arg: {
        Options.confirmation = true;
        break;
      }
      case regexes.noTable.test(arg) && arg: {
        Options.noTable = true;
        break;
      }
      case regexes.dryRun.test(arg) && arg: {
        Options.dryRun();
        break;
      }
      case regexes.maxThreads.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "max-threads";
        break;
      }
      case regexes.input.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "input";
        lastIndex = arg.match(regexes.input)?.groups;
        break;
      }
      case regexes.reverbVolume.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "reverb";
        lastIndex = arg.match(regexes.reverbVolume)?.groups;
        break;
      }
      case regexes.volume.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "volume";
        lastIndex = arg.match(regexes.volume)?.groups;
        break;
      }
      case regexes.effects.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "effects";
        lastIndex = arg.match(regexes.effects)?.groups;
        break;
      }
      case regexes.format.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "format";
        break;
      }
      case regexes.sampleRate.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "sample-rate";
        lastIndex = arg.match(regexes.sampleRate)?.groups;
        break;
      }
      case regexes.loopStart.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "loop-start";
        lastIndex = arg.match(regexes.loopStart)?.groups;
        break;
      }
      case regexes.loopEnd.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "loop-end";
        lastIndex = arg.match(regexes.loopEnd)?.groups;
        break;
      }
      case regexes.loop.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");

        lastParam = "loop";
        lastIndex = arg.match(regexes.loop)?.groups;
        break;
      }
      case (lastParam === "input" || lastParam === undefined)
            && (global.fs ??= await import("node:fs")).existsSync(arg)
            && arg: {
        if (doneFileList.get(arg) === doneSymbol) {
          if (lastParam === "input") clearLastVariables()
          break;
        }
        doneFileList.set(arg, doneSymbol)

        setFilePromises.push(
          setFile({
            indexOfSetFile: indexOfSetFile++,
            lastParam, lastIndex, lastAutomaticFile,
            newArguments: noDuplicates, arg
          })
        )
        if (!lastParam) lastAutomaticFile = arg;
        if (lastParam === "input") clearLastVariables()
        break;
      }

      default:
        switch (lastParam) {
          case "loop":
            setLoop(arg, lastIndex)
            clearLastVariables()
            break;
          case "loop-start":
            setLoopStart(arg, lastIndex)
            clearLastVariables()
            break;
          case "loop-end":
            setLoopEnd(arg, lastIndex)
            clearLastVariables()
            break;
          case "sample-rate":
            setSampleRate(arg, lastIndex, newArguments)
            clearLastVariables()
            break;
          case "format":
            setFormat(arg)
            clearLastVariables()
            break;
          case "volume":
            setVolume(arg, lastIndex)
            clearLastVariables()
            break;
          case "reverb":
            setReverb(arg, lastIndex)
            clearLastVariables()
            break;
          case "effects":
            setEffects(arg, lastIndex)
            clearLastVariables()
            break;
          case "max-threads":
            setMaxThreads(arg)
            clearLastVariables()
            break;

          default:
            await help({
              errorText: red+`'${
                underline+dimRed +
                arg +
                normal+red
              }' is an invalid parameter`+normal
            })
            process.exit()
        }
    }
  }
  /*
    Adds files to the list asynchronously/in parallel
    by chaining each function to the previous one
    so that they stay syncronized and up to date.

    This means there's no performance loss because of
    the async nature of them and it remains in
    a sequential order regardless of execution timings.

    (e.g. sort order is the same like in process.argv
     because each returned Promise waits before
     actually adding the file)
  */
  await Promise.all(await Promise.all(setFilePromises))
  if (!Object.keys(Options.all.files ?? []).length) {
    console.error(`${red}Missing required files${normal}`);
    process.exit(1)
  }
}

/**
 * Sets a supported file inside a group in Options class
 * @param {module:typeDefinitions~setFileObjectParameters} setFileObjectParameters
 * @return {Promise<Promise|undefined>}
 */
const setFile = async ({
  indexOfSetFile,
  lastParam, lastIndex, lastAutomaticFile,
  newArguments, arg
}) => {
  /**
   * Checks for the same basename as the path given inside process.argv
   * @param {String} path - full file path to compare with another one
   * @inner
   * @private
   * @memberof module:cli
   * @return {Boolean} - whether or not it has found a similar file inside process.argv
   */
  function checkForIdenticalName(path) {
    const indexOfPath = newArguments.indexOf(path);
    const pathUpToName = join(parse(path).dir, parse(path).name);
    const noExtNewArguments = [...argvWithoutFileExts];

    delete noExtNewArguments[indexOfPath]
    return noExtNewArguments.includes(pathUpToName);
  }
  /**
   * Returns either a new Promise or attaches a .then Promise to an older one
   * @param {Function} func function to run within a Promise
   * @inner
   * @private
   * @memberof module:cli
   * @return {(Promise|undefined)} - a new Promise that'll fulfill when the given function returns
   */
  function createPromise(func) {
    const lastSetFilePromise = setFilePromises[indexOfSetFile-1];
    return (!lastSetFilePromise)
              ? func()
              : lastSetFilePromise.then(() => func());
  }
  if (lastParam !== undefined && lastParam !== "input") return;

  const fileMagicNumber = await get20BytesFromFile(arg);
  let typeOfFile;
  switch (true) {
    case fileMagicNumber.includes("MThd"):
      typeOfFile = true;
      break;
    case fileMagicNumber.includes("sfbk"):
    case fileMagicNumber.includes("DLS"):
      typeOfFile = false;
      break;

    default:
      // Incompatible file
      return;
  }

  const inputIndex = Number(lastIndex?.index ?? 0);
  const logMessages = {
    getMessage(type, arg, index) {
      return (type)
        ? `Set midi file to "${arg}" at index ${index}`
        : `Set soundfont file to "${arg}" at index ${index}`;
    },
    getReplacedSoundfont(original, newOne, index) {
      return `Replaced soundfont file from "${original}" to "${newOne}" at index ${index}`;
    }
  };
  if (lastIndex?.index || lastParam) {
    return createPromise(async () => {
      let needsToBeReplaced = false;

      // Replaces the last soundfont it can reach if it needs to
      if (!typeOfFile) {
        const setOfFiles = Options.all.files[inputIndex];
        const fileMagicNumber = (setOfFiles instanceof Set)
          ? await get20BytesFromFile(setOfFiles.getIndex(0))
          : [];
        if (fileMagicNumber.includes("sfbk")
            || fileMagicNumber.includes("DLS")) needsToBeReplaced = true;
      }
      Options.files(inputIndex, arg, !typeOfFile, needsToBeReplaced)
      log(1,
        performance.now().toFixed(2),
        logMessages.getMessage(typeOfFile, arg, inputIndex)
      )
    });
  }

  // --- Automatic addition of files section ---
  return createPromise(async () => {
    /*
      ⏳ if one group inside Options.all
         has the same basename as arg,
         then it adds arg to that group
      ❌ Otherwise it runs the next check below it
      (e.g. index 2 and he needs to add to that,
       that's why it's seperated otherwise it creates
       a new Set when it already exists)
    */
    const pathUpToName = join(parse(arg).dir, parse(arg).name);
    const foundIndex = Options.searchAddedFile(pathUpToName, typeOfFile);
    if (typeof foundIndex === "number") {
      Options.files(foundIndex, arg, !typeOfFile);
      log(1,
        performance.now().toFixed(2),
        logMessages.getMessage(typeOfFile, arg, foundIndex)
      )
      return;
    }
    if (argvWithoutFileExts instanceof Promise) argvWithoutFileExts = await argvWithoutFileExts;
    // Creates new Sets for identical basename files
    if (checkForIdenticalName(arg)) {
      const amountOfGroups = Options.amountOfGroups;
      Options.files(amountOfGroups, arg, !typeOfFile)
      log(1,
        performance.now().toFixed(2),
        logMessages.getMessage(typeOfFile, arg, amountOfGroups)
      )
      return;
    }
    // It just adds to the last Set it can reach
    let lastKnownGroupIndex = Options.lastKnownGroupIndex ?? 0;
    // or maybe to the last automatic group
    // if a file has been added automatically last time
    if (lastAutomaticFile) automaticFileCheck: {
      const pathUpToName = join(parse(lastAutomaticFile).dir, parse(lastAutomaticFile).name);
      const indexOfGroup = Options.searchAddedFile(pathUpToName);
      if (typeof indexOfGroup !== "number") break automaticFileCheck;

      if (Options.isAutomaticBasenameGroup(argvWithoutFileExts, indexOfGroup)) {
        lastKnownGroupIndex++
      } else {
        lastKnownGroupIndex = indexOfGroup;
      }
    }
    Options.files(lastKnownGroupIndex, arg, !typeOfFile);
    log(1,
      performance.now().toFixed(2),
      logMessages.getMessage(typeOfFile, arg, lastKnownGroupIndex)
    )
  });
  // --- END of automatic addition of files section ---
}
/**
 * Sets the Options.loopAmount variable
 * @param {String} arg - the loop amount
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 */
const setLoop = (arg, lastIndex) => {
  const number = Number(arg),
        lastIndexNumber = Number(lastIndex?.index);
  if (typeof number === "number" && !regexes.infinity.test(arg)) {
    Options.loopAmount(lastIndexNumber, number);
    log(1, performance.now().toFixed(2), `Set loop amount to ${number} at ${lastIndex?.index} index`)
    return;
  }
  if (regexes.infinity.test(arg)) {
    console.error(`${normalRed}Can't use infinity, sorry${normal}`)
    process.exit(1);
  }
  console.error(`${normalRed}Passed something that wasn't a number${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.loopStart variable
 * @param {String} arg - the start of the loop in seconds or in HH:MM:SS:ms format
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 */
const setLoopStart = (arg, lastIndex) => {
  const number = Number(arg),
        lastIndexNumber = Number(lastIndex?.index);
  if (typeof number === "number"
      || !isNaN(Date.parse(`1970T${arg}Z`))) {
    if (regexes.ISOTimestamp.test(arg)) {
      const seconds = Date.parse(`1970T${arg}Z`) / 1000;
      Options.loopStart(lastIndexNumber, seconds);
      log(1, performance.now().toFixed(2), `Set loop-start to ${seconds} at ${lastIndex?.index} index`)
      return;
    }
    Options.loopStart(lastIndexNumber, number);
    log(1, performance.now().toFixed(2), `Set loop-start to ${number} at ${lastIndex?.index} index`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a number or in ISO string format${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.loopEnd variable
 * @param {String} arg - the end of the loop in seconds or in HH:MM:SS:ms format
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 */
const setLoopEnd = (arg, lastIndex) => {
  const number = Number(arg),
        lastIndexNumber = Number(lastIndex?.index);
  if (typeof number === "number"
      || !isNaN(Date.parse(`1970T${arg}Z`))) {
    if (regexes.ISOTimestamp.test(arg)) {
      const seconds = Date.parse(`1970T${arg}Z`) / 1000;
      Options.loopEnd(lastIndexNumber, seconds);
      log(1, performance.now().toFixed(2), `Set loop-end to ${seconds} at ${lastIndex?.index} index`)
      return;
    }
    Options.loopEnd(lastIndexNumber, number);
    log(1, performance.now().toFixed(2), `Set loop-end to ${number} at ${lastIndex?.index} index`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a number or in ISO string format${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.sampleRate variable
 * @param {String} arg - the sample rate to set
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 * @param {String[]} newArguments - process.argv without 2 starting indexes
 */
const setSampleRate = (arg, lastIndex, newArguments) => {
  const number = Number(arg);
  if (typeof number === "number" && !arg.startsWith("-")) {
    if (newArguments.find(testFunctions.stdout)) {
      Options.stdoutSampleRate = number;
      log(1, performance.now().toFixed(2), `Set sample rate for all to ${number} because output is stdout`)
      return;
    }
    Options.sampleRate(Number(lastIndex?.index), number);
    log(1, performance.now().toFixed(2), `Set sample rate to ${number} at ${lastIndex?.index} index`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number${normal}`)
  process.exit(1);
}
/**
 * Simply changes how the program should log
 * @param {String} arg - the level of how much it should log
 */
const setVerboseLevel = async (arg) => {
  const number = Number(arg);
  const isFromUser = arg !== undefined;
  if (!arg) arg = "2";
  if (!global.fs) global.fs = await import("fs");
  if (typeof number === "number"
      && !(number < 0 && number > 2)
      && !arg.startsWith("-")) {
    Options.verboseLevel = number;
    if (isFromUser) {
      log(1, performance.now().toFixed(2), `Set verbose level asked by the user to ${number}`)
    } else log(1, performance.now().toFixed(2), `Set verbose level to ${number}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.format variable for use in stdout mode
 * @param {String} arg - the format to use (similar to ffmpeg's -f)
 */
const setFormat = arg => {
  switch (arg) {
    case regexes.wavFormat.test(arg) && arg: {
      Options.format = "wave";
      log(1, performance.now().toFixed(2), `Set stdout format to "wave"`)
      return;
    }
    case "flac": {
      Options.format = "flac";
      log(1, performance.now().toFixed(2), `Set stdout format to "flac"`)
      return;
    }
    case "mp3": {
      Options.format = "mp3";
      log(1, performance.now().toFixed(2), `Set stdout format to "mp3"`)
      return;
    }
    case regexes.rawFormat.test(arg) && arg: {
      Options.format = "pcm";
      log(1, performance.now().toFixed(2), `Set stdout format to "pcm"`)
      return;
    }
  }
  console.error(`${normalRed}Passed something that wasn't an available format${normal}`)
  process.exit(1);
}
/**
 * Applies effects from the user's string passed through --effects
 * @param {String} arg - the comma-separeted string to parse
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 */
const setEffects = (arg, lastIndex) => {
  const regexListOfEffects = (
    "allpass|band|bandpass|bandreject|bass|bend|biquad" +
    "|chorus|channels|compand|contrast|dcshift|deemph|delay" +
    "|dither|divide|downsample|earwax|echo|echos|equalizer" +
    "|fade|fir|firfit|flanger|gain|highpass|hilbert|input" +
    "|ladspa|loudness|lowpass|mcompand|noiseprof|noisered" +
    "|norm|oops|output|overdrive|pad|phaser|pitch|rate|remix" +
    "|repeat|reverb|reverse|riaa|silence|sinc|spectrogram" +
    "|speed|splice|stat|stats|stretch|swap|synth|tempo" +
    "|treble|tremolo|trim|upsample|vad|vol"
  );
  const regexGroupListGetter = /([a-z]+) ?([-a-z\d ]+)?/gm;
  const regexTests = {
    // is it a list structured like
    //   <effect1>[values1],<effect2>[values2]?
    normalList: new RegExp(`${regexGroupListGetter.source},${regexGroupListGetter.source}`).test(arg),
    // is it a single effect like
    //   <effect>[values]?
    isIncorrect: new RegExp(`^${regexGroupListGetter.source}[^,](?:${regexListOfEffects}).*$`).test(arg)
  }
  if (regexTests.normalList || !regexTests.isIncorrect) {
    const list = [
      ...arg
        .matchAll(regexGroupListGetter)
        .map(i => ({
          effect: i[1],
          values: (i[2])
            ? i[2].split(
              (i[2].includes(",")) ? "," : " "
            )
            : undefined
        }) )
    ];

    if (!list
          .every(i => new RegExp(regexListOfEffects).test(i.effect))
    ) {
      console.error(`${normalRed}One effect that you passed doesn't exist in SoX${normal}`);
      process.exit(1);
    }

    Options.effects(Number(lastIndex?.index), list);
    log(1, performance.now().toFixed(2), `Set list of SoX effects as ${global.effects}`)
    return;
  }
  console.error(`${normalRed}The string for SoX effects you passed is not usable${normal}`);
  process.exit(1);
}
/**
 * Sets the Options.volume variable for the masterGain
 * @param {String} arg - the volume in either percentage, decibels or decimals
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 */
const setVolume = (arg, lastIndex) => {
  const number = Number(arg),
        lastIndexNumber = Number(lastIndex?.index);
  if (regexes.areDecibels.test(arg)) {
    const dBNumber = Number(arg.match(regexes.decibelNumber)[1]);
    const toPercentage = 10**(dBNumber/10);
    Options.volume(lastIndexNumber, toPercentage);
    log(1, performance.now().toFixed(2), `Set volume to ${toPercentage} at ${lastIndex?.index} index`)
    return;
  }
  if (regexes.isPercentage.test(arg)) {
    const percentage = Number(arg.match(regexes.percentageNumber)[1]);
    Options.volume(lastIndexNumber, percentage / 100);
    log(1, performance.now().toFixed(2), `Set volume to ${percentage / 100} at ${lastIndex?.index} index`)
    return;
  }
  if (typeof number === "number" && !arg.startsWith("-")) {
    Options.volume(lastIndexNumber, number);
    log(1, performance.now().toFixed(2), `Set volume to ${number} at ${lastIndex?.index} index`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number/dB/percentage${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.reverb variable
 * @param {String} arg - the volume in either percentage, decibels or decimals
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 */
const setReverb = (arg, lastIndex) => {
  const number = Number(arg),
        lastIndexNumber = Number(lastIndex?.index);
  if (regexes.areDecibels.test(arg)) {
    const dBNumber = Number(arg.match(regexes.decibelNumber)[1]);
    Options.reverbVolume(lastIndexNumber, dBNumber);
    Options.effects(lastIndexNumber, []);
    log(1, performance.now().toFixed(2), `Set reverb volume to ${dBNumber} and effects variable to ${lastIndex?.index}`)
    return;
  }
  if (regexes.isPercentage.test(arg)) {
    const percentage = Number(arg.match(regexes.percentageNumber)[1]);
    const toDB = 10 * 10**(percentage/100);
    Options.reverbVolume(lastIndexNumber, toDB);
    Options.effects(lastIndexNumber, []);
    log(1, performance.now().toFixed(2), `Set reverb volume to ${toDB} and effects variable to ${lastIndex?.index}`)
    return;
  }
  if (typeof number === "number" && !arg.startsWith("-")) {
    Options.reverbVolume(lastIndexNumber, number);
    Options.effects(Number(lastIndex?.index), []);
    log(1, performance.now().toFixed(2), `Set reverb volume to ${Number(arg)} and effects variable to ${lastIndex?.index}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number/dB/percentage${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.maxThreads variable
 * @param {String} arg - number of threads to set
 */
const setMaxThreads = async (arg) => {
  const number = Number(arg);
  const { availableParallelism } = await import("os");
  if (typeof number === "number" && !isNaN(number)
      && number <= availableParallelism() * 2
      && number >= 1) {
    Options.maxThreads = number;
    log(1, performance.now().toFixed(2), `Set max threads to ${number}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number of threads${normal}`)
  process.exit(1);
}
/**
 * Sets the file path to the log file
 * @param {String} arg - Path to the log file
 */
const setLogFilePath = arg => {
  Options.logFilePath = arg ?? "./spesso.log";
  log(1, performance.now().toFixed(2), `Set log file path to ${arg ?? "./spesso.log"}`)
}
/**
 * Runs uninstall.mjs and uninstall spessoplayer
 */
const uninstall = async () => {
  const { execSync } = await import("child_process");
  const uninstallScriptPath = join(import.meta.dirname, "uninstall.mjs");
  const isGloballyInstalled = /spessoplayer/.test(execSync("npm ls -g").toString());

  log(1, performance.now().toFixed(2), `Launched ${uninstallScriptPath}`)
  try {
    execSync(`node ${uninstallScriptPath}`, {stdio: "inherit"})
  } catch (e) {
    if (e.status !== 0 && e.status !== 2) {
      console.error(`${red}Uninstallation interrupted with error ${e.status}${normal}`);
      process.exit(2);
    }
    if (e.status === 2) process.exit(2)
  }
  log(1, performance.now().toFixed(2), "Uninstalling spessoplayer")
  execSync(`npm uninstall ${(isGloballyInstalled) ? "-g" : ""} spessoplayer`, { cwd: ".", stdio: "inherit" })
}
/**
 * Shows the help text
 * @param {Object} [errorObject=""] - an object containing additional info that should be printed alongside help
 * @param {String} [errorObject.errorText] - error text that should be printed before helpText
 */
const help = async ({ errorText } = "") => {
  const optionalIndex = `${normal}[${dimGray}n${normal}]`;
  const optionalVerboseIndex = `${normal}[${dimGray}=n${normal}]`;

  const helpText = `${underline}spessoplayer${normal}
  ${dimGrayBold}A midi converter that uses spessasynth_core to generate the data${normal}

  Usage:
    ${bold}spessoplayer${normal} [${dimGray}options${normal}] <midi> <soundfont> [${dimGray}outFile${normal}]

  Available parameters:
    ${green}--input${optionalIndex}, ${green}/input${optionalIndex},
     ${green}-i${optionalIndex}, ${green}/i${optionalIndex}:
      ${dimGray+italics}Takes the next file and puts it in the list by index${normal}

    ${green}--volume${optionalIndex}, ${green}/volume${optionalIndex},
     ${green}-vol${optionalIndex}, ${green}/vol${optionalIndex}:
      ${dimGray+italics}Volume to set (default: 100%)${normal}

      ${dimGray+italics}Available formats:${normal}
      ${dimGray+italics}- dB (example -10dB)${normal}
      ${dimGray+italics}- percentages (example 70%)${normal}
      ${dimGray+italics}- decimals (example 0.9)${normal}

    ${green}--reverb-volume${optionalIndex}, ${green}/reverb-volume${optionalIndex},
     ${green}-rvb${optionalIndex}, ${green}/rvb${optionalIndex}:
      ${dimGray+italics}Volume to set for reverb (default: none)${normal}
      ${dimGray+italics}Same formats as volume${normal}

    ${green}--effects${optionalIndex}, ${green}/effects${optionalIndex},
     ${green}-e${optionalIndex}, ${green}/e${optionalIndex}:
      ${dimGray+italics}Adds any effects that SoX provides (e.g "reverb,fade 1")${normal}

    ${green}--loop${optionalIndex}, ${green}/loop${optionalIndex},
     ${green}-l${optionalIndex}, ${green}/l${optionalIndex}:
      ${dimGray+italics}Loop x amount of times (default: 0)${normal}
        ${dimGray+italics}(It might be slow with bigger numbers)${normal}

    ${green}--loop-start${optionalIndex}, ${green}/loop-start${optionalIndex},
     ${green}-ls${optionalIndex}, ${green}/ls${optionalIndex}:
      ${dimGray+italics}When the loop starts${normal}

    ${green}--loop-end${optionalIndex}, ${green}/loop-end${optionalIndex},
     ${green}-le${optionalIndex}, ${green}/le${optionalIndex}:
      ${dimGray+italics}When the loop ends${normal}

    ${green}--sample-rate${optionalIndex}, ${green}/sample-rate${optionalIndex},
     ${green}-r${optionalIndex}, ${green}/r${optionalIndex}:
      ${dimGray+italics}Sample rate to use (default: 48000)${normal}
        ${dimGray+italics}(It might be slow with bigger numbers for players like mpv)${normal}
        ${dimGray+italics}(Some players might downsize it to a smaller frequency)${normal}

    ${green}--format${normal}, ${green}/format${normal},
     ${green}-f${normal}, ${green}/f${normal}:
      ${dimGray+italics}Format to use for stdout (default: wav)${normal}

      ${dimGray+italics}Available formats:${normal}
      ${dimGray+italics}- wav${normal}
      ${dimGray+italics}- mp3${normal}
      ${dimGray+italics}- flac${normal}
      ${dimGray+italics}- pcm (s32le)${normal}

    ${green}--max-threads${normal}, ${green}/max-threads${normal}, ${green}--threads${normal}, ${green}/threads${normal},
     ${green}-mt${normal}, ${green}/mt${normal}, ${green}-T${normal}, ${green}/T${normal}:
      ${dimGray+italics}Sets the amount of threads to use when writing to files.${normal}
      ${dimGray+italics}Useful when you don't have much RAM${normal}

    ${green}--ask${normal}, ${green}/ask${normal}, ${green}--confirm${normal}, ${green}/confirm${normal},
     ${green}-a${normal}, ${green}/a${normal}, ${green}-c${normal}, ${green}/c${normal}:
      ${dimGray+italics}Asks for confirmation before proceeding${normal}

    ${green}--no-table${normal}, ${green}/no-table${normal},
     ${green}-nt${normal}, ${green}/nt${normal}:
      ${dimGray+italics}When asking for confirmation,
      ${dimGray+italics}it'll show the information in a JSON-like format instead of a table${normal}

    ${green}--dry-run${normal}, ${green}/dry-run${normal}, ${green}--test${normal}, ${green}/test${normal}, ${green}--null${normal}, ${green}/null${normal},
     ${green}-dr${normal}, ${green}/dr${normal}, ${green}-t${normal}, ${green}/t${normal}, ${green}-0${normal}, ${green}/0${normal}:
      ${dimGray+italics}Runs the program as normal but
      ${dimGray+italics}it'll write to /dev/null on unix and \\\\.\\nul on windows.${normal}
      ${dimGray+italics}Mainly used for testing purposes but
      ${dimGray+italics}can be useful when trying to debug with log options${normal}

    ${green}--verbose${optionalVerboseIndex}, ${green}/verbose${optionalVerboseIndex},
     ${green}-v${optionalVerboseIndex}, ${green}/v${optionalVerboseIndex}:
      ${dimGray+italics}Sets the verbosity (default: 2)${normal}

    ${green}--log-file${normal}, ${green}/log-file${normal},
     ${green}-lf${normal}, ${green}/lf${normal}:
      ${dimGray+italics}Sets path to the log file (default: ./spesso.log)${normal}
        ${dimGray+italics}(Meanwhile it writes to file, it also prints to stderr)${normal}

    ${green}--uninstall${normal}, ${green}/uninstall${normal},
     ${green}-u${normal}, ${green}/u${normal}:
      ${dimGray+italics}Uninstalls dependencies with confirmation and the entire program${normal}

    ${green}--help${normal}, ${green}/help${normal},
     ${green}-h${normal}, ${green}/h${normal}, ${green}/?${normal}:
      ${dimGray+italics}Shows this help message${normal}

    ${green}--version${normal}, ${green}/version${normal}:
     ${green}-V${normal}, ${green}/V${normal}:
      ${dimGray+italics}Shows the installed version${normal}
  `
  if (process.env.PAGER) {
    const { spawnSync } = await import("child_process");
    const PAGERCommand = process.env.PAGER.split(" ").slice(0, 1)[0],
          PAGERArguments = process.env.PAGER.split(" ").slice(1);
    spawnSync(
      PAGERCommand,
      [...PAGERArguments],
      {
        stdio: ["pipe", "inherit", "inherit"],
        input: (errorText)
          ? errorText+"\n"+helpText
          : helpText
      }
    )
    return;
  }
  if (errorText) console.error(errorText)
  console.log(helpText)
}
/**
 * Shows the version number taken from package.json
 */
const version = async () => {
  const fs = await import("node:fs");
  const packageJSONPath = join(import.meta.dirname, "package.json");
  const { version: versionNumber } = JSON.parse(fs.readFileSync(packageJSONPath).toString());

  log(1, performance.now().toFixed(2), `Taken version number from ${packageJSONPath}`)
  console.log(`${green + versionNumber + normal}`)
}

export {
  actUpOnPassedArgs,
  join, parse,
  Options
}

