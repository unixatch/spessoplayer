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
import {
  ERROR_LVL, WARNING_LVL,
  INFO_LVL,  DEBUG_LVL,
  log, Options
} from "./utils/utils.mjs"

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
  // These look like --option or --option[=n]
  verboseLevel: new RegExp([
    "^(?:--verbose(?:=(?<number>\\d))*",
    "|\\/verbose(?:=(?<number>\\d))*",
    "|-v(?:=(?<number>\\d))*",
    "|\\/v(?:=(?<number>\\d))*)$"
  ].join("")),

  logFile: new RegExp([
    "^(?:--log-file(?:=(?<path>\\w+))*",
    "|\\/log-file(?:=(?<path>\\w+))*",
    "|-lf(?:=(?<path>\\w+))*",
    "|\\/lf(?:=(?<path>\\w+))*)$"
  ].join("")),
  textDelay: new RegExp([
    "^(?:--text-delay(?:=(?<number>\\d+))*",
    "|\\/text-delay(?:=(?<number>\\d+))*",
    "|-d(?:=(?<number>\\d+))*",
    "|\\/d(?:=(?<number>\\d+))*)$"
  ].join("")),

  wav: /^.*(?:\.wav|\.wave)$/,
  flac: /^.*\.flac$/,
  mp3: /^.*\.mp3$/,
  raw: /^.*\.(?:s16le|f32le|pcm)$/,

  // Instead these like --option or --option[n]
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
  stdout: set => set.has("-"),
  help(set) {
    return (
      set.has("--help")
      || set.has("/help")
      || set.has("-h") || set.has("/h")
      || set.has("/?")
    );
  },
  version(set) {
    return (
      set.has("--version") || set.has("/version")
      || set.has("-V") || set.has("/V")
    );
  },
  uninstall(set) {
    return (
      set.has("--uninstall") || set.has("/uninstall")
      || set.has("-u") || set.has("/u")
    );
  },
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
    .once("error", ({code, message, errno}) => {
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
const {
  [0]: WAV_INDEX,  [1]: RAW_INDEX,
  [2]: FLAC_INDEX, [3]: MP3_INDEX
} = [...Array(4).keys()];
export const FO_CONSTANTS = {
  WAV_INDEX,  RAW_INDEX,
  FLAC_INDEX, MP3_INDEX
};
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
  if (testFunctions.help(newArgumentsSet)) {
    await help()
    process.exit()
  }
  if (testFunctions.version(newArgumentsSet)) {
    await version()
    process.exit()
  }
  if (testFunctions.uninstall(newArgumentsSet)) {
    await uninstall()
    process.exit()
  }

  const isVerboseLevelSet = newArguments.find(testFunctions.verboseLevel);
  if (isVerboseLevelSet) {
    let verboseOptionNumber = isVerboseLevelSet.match(regexes.verboseLevel).groups.number;
    const verboseOptionPosition = newArguments.indexOf(isVerboseLevelSet);

    if (!verboseOptionNumber) verboseOptionNumber = INFO_LVL+"";
    // Delete verbose-level from newArguments
    newArguments.splice(verboseOptionPosition, 1)

    if (!process.env["DEBUG_LEVEL_SPESSO"]) {
      await setVerboseLevel(verboseOptionNumber)
    } else log(INFO_LVL, `Using variable DEBUG_LEVEL_SPESSO=${process.env["DEBUG_LEVEL_SPESSO"]}`)
  } else if (process.env["DEBUG_LEVEL_SPESSO"]) {
    log(INFO_LVL, `Using variable DEBUG_LEVEL_SPESSO=${process.env["DEBUG_LEVEL_SPESSO"]}`)
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
    } else log(INFO_LVL, `Using variable DEBUG_FILE_SPESSO=${process.env["DEBUG_FILE_SPESSO"]}`)
  } else if (process.env["DEBUG_FILE_SPESSO"]) {
    log(INFO_LVL, `Using variable DEBUG_FILE_SPESSO=${process.env["DEBUG_FILE_SPESSO"]}`)
  }

  function clearLastVariables() {
    lastParam = undefined,
    lastIndex = undefined;
  }
  function stdoutFileModeConflictError() {
    console.error(`${red}Can't use both stdout and file mode at the same time${normal}`)
    process.exit(1)
  }
  function existsNextValueCheck(arg, newArguments) {
    // In case there's no other argument
    const indexOfArg = newArguments.indexOf(arg);
    if (newArguments[indexOfArg + 1] === undefined) {
      throw new ReferenceError("Missing necessary argument")
    }
  }
  const isStdout = testFunctions.stdout(newArgumentsSet);
  let indexOfSetFile = 0,
      lastAutomaticFile,
      groupSeparator;
  for (const arg of newArguments) {
    switch (arg) {
      case "|": { groupSeparator = true; break; }
      case "-": {
        if (Options.isFileMode()) stdoutFileModeConflictError()
        Options.toStdout = true;
        log(INFO_LVL, "Set stdout mode")
        break;
      }
      case regexes.wav.test(arg) && arg: {
        if (isStdout) stdoutFileModeConflictError()
        Options.fileOutputs(WAV_INDEX, arg);
        log(INFO_LVL, "Set file output to wav")
        break;
      }
      case regexes.raw.test(arg) && arg: {
        if (isStdout) stdoutFileModeConflictError()
        Options.fileOutputs(RAW_INDEX, arg);
        log(INFO_LVL, "Set file output to pcm")
        break;
      }
      case regexes.flac.test(arg) && arg: {
        if (isStdout) stdoutFileModeConflictError()
        Options.fileOutputs(FLAC_INDEX, arg);
        log(INFO_LVL, "Set file output to flac")
        break;
      }
      case regexes.mp3.test(arg) && arg: {
        if (isStdout) stdoutFileModeConflictError()
        Options.fileOutputs(MP3_INDEX, arg);
        log(INFO_LVL, "Set file output to mp3")
        break;
      }
      case "--ask":     case "/ask":
      case "--confirm": case "/confirm":
      case "-a":        case "/a":
      case "-c":        case "/c": {
        Options.confirmation = true;
        log(INFO_LVL, "Set confirmation flag")
        break;
      }
      case "--no-table": case "/no-table":
      case "-nt":        case "/nt": {
        Options.noTable = true;
        log(INFO_LVL, "Set no-table flag")
        break;
      }
      case "--no-progress": case "/no-progress":
      case "-np":           case "/np": {
        Options.noProgress = true;
        log(INFO_LVL, "Set no-progress flag")
        break;
      }
      case "--dry-run": case "/dry-run":
      case "--test":    case "/test":
      case "--null":    case "/null":
      case "-dr":       case "/dr":
      case "-t":        case "/t":
      case "-0":        case "/0": {
        Options.dryRun();
        log(INFO_LVL, "Set dry-run mode")
        break;
      }
      case "--max-threads": case "/max-threads":
      case "--threads":     case "/threads":
      case "-mt":           case "/mt":
      case "-T":            case "/T": {
        existsNextValueCheck(arg, newArguments)
        lastParam = "max-threads";
        break;
      }
      case "--show-usage": case "/show-usage":
      case "-U":           case "/U": {
        if (!isStdout) {
          Options.showUsage = true;
          log(INFO_LVL, "Set show-usage flag")
        } else log(WARNING_LVL, `${normal+normalYellow}Ignored show-usage flag since stdout mode is enabled${normal}`)
        break;
      }
      // stdout format must be of only 1 kind
      // otherwise players like mpv won't read the output correctly
      case "--format": case "/format":
      case "-f":       case "/f": {
        existsNextValueCheck(arg, newArguments)
        lastParam = "format";
        break;
      }
      case regexes.textDelay.test(arg) && arg: {
        if (!testFunctions.stdout(newArgumentsSet)) {
          setTextDelay(arg)
        } else log(WARNING_LVL, `${normal+normalYellow}Ignored text-delay flag since stdout mode is enabled${normal}`)
        break;
      }
      case regexes.input.test(arg) && arg: {
        existsNextValueCheck(arg, newArguments)
        lastParam = "input";
        lastIndex = arg.match(regexes.input)?.groups;
        break;
      }
      case regexes.reverbVolume.test(arg) && arg: {
        existsNextValueCheck(arg, newArguments)
        lastParam = "reverb";
        lastIndex = arg.match(regexes.reverbVolume)?.groups;
        break;
      }
      case regexes.volume.test(arg) && arg: {
        existsNextValueCheck(arg, newArguments)
        lastParam = "volume";
        lastIndex = arg.match(regexes.volume)?.groups;
        break;
      }
      case regexes.effects.test(arg) && arg: {
        existsNextValueCheck(arg, newArguments)
        lastParam = "effects";
        lastIndex = arg.match(regexes.effects)?.groups;
        break;
      }
      case regexes.sampleRate.test(arg) && arg: {
        existsNextValueCheck(arg, newArguments)
        lastParam = "sample-rate";
        lastIndex = arg.match(regexes.sampleRate)?.groups;
        break;
      }
      case regexes.loopStart.test(arg) && arg: {
        existsNextValueCheck(arg, newArguments)
        lastParam = "loop-start";
        lastIndex = arg.match(regexes.loopStart)?.groups;
        break;
      }
      case regexes.loopEnd.test(arg) && arg: {
        existsNextValueCheck(arg, newArguments)
        lastParam = "loop-end";
        lastIndex = arg.match(regexes.loopEnd)?.groups;
        break;
      }
      case regexes.loop.test(arg) && arg: {
        existsNextValueCheck(arg, newArguments)
        lastParam = "loop";
        lastIndex = arg.match(regexes.loop)?.groups;
        break;
      }
      case (
        (lastParam === "input" || !lastParam)
          && (
            global.fs ??= await import("node:fs")
          )
            .existsSync(arg) && arg
      ): {
        if (doneFileList.get(arg) === doneSymbol) {
          if (lastParam === "input") clearLastVariables()
          break;
        }
        doneFileList.set(arg, doneSymbol)

        setFilePromises.push(
          setFile({
            indexOfSetFile: indexOfSetFile++,
            lastParam, lastIndex,
            lastAutomaticFile, groupSeparator,
            newArguments: noDuplicates, arg
          })
        )
        if (!lastParam) lastAutomaticFile = arg;
        if (lastParam === "input") clearLastVariables()
        groupSeparator &&= undefined;
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
            setSampleRate(arg, lastIndex, newArgumentsSet)
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
            if (!testFunctions.stdout(newArgumentsSet)) {
              setMaxThreads(arg)
            } else log(WARNING_LVL, `${normalYellow}Ignoring this flag since stdout mode is enabled${normal}`)
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
  lastParam, lastIndex,
  lastAutomaticFile, groupSeparator,
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
    return lastSetFilePromise?.then(func) ?? func();
  }
  if (lastParam && lastParam !== "input") return;

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
      const typeOfFile = type ? "midi" : "soundfont";
      return `Set ${typeOfFile} file to "${arg}" at index ${index}`;
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
      log(INFO_LVL, logMessages.getMessage(typeOfFile, arg, inputIndex))
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
      log(INFO_LVL, logMessages.getMessage(typeOfFile, arg, foundIndex))
      return;
    }
    if (argvWithoutFileExts instanceof Promise) argvWithoutFileExts = await argvWithoutFileExts;
    // Creates new Sets for identical basename files
    if (checkForIdenticalName(arg)) {
      const amountOfGroups = Options.amountOfGroups;
      Options.files(amountOfGroups, arg, !typeOfFile)
      log(INFO_LVL, logMessages.getMessage(typeOfFile, arg, amountOfGroups))
      return;
    }
    // It just adds to the last Set it can reach
    let lastKnownGroupIndex = Options.lastKnownGroupIndex ?? 0;
    // or maybe to the last automatic group
    // if a file has been added automatically last time
    if (lastAutomaticFile) automaticFileCheck: {
      const {
        dir: fileDir, name: fileName
      } = parse(lastAutomaticFile);
      const pathUpToName = join(fileDir, fileName);
      let indexOfGroup = Options.searchAddedFile(pathUpToName);
      if (typeof indexOfGroup !== "number") break automaticFileCheck;

      if (Options.isAutomaticBasenameGroup(argvWithoutFileExts, indexOfGroup)) {
        lastKnownGroupIndex++
        break automaticFileCheck;
      }
      // or it creates a new group
      // if the group separator has been used
      lastKnownGroupIndex = groupSeparator ? ++indexOfGroup : indexOfGroup;
    }
    Options.files(lastKnownGroupIndex, arg, !typeOfFile);
    log(INFO_LVL, logMessages.getMessage(typeOfFile, arg, lastKnownGroupIndex))
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
    log(INFO_LVL, `Set loop amount to ${number} at ${lastIndex?.index} index`)
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
      log(INFO_LVL, `Set loop-start to ${seconds} at ${lastIndex?.index} index`)
      return;
    }
    Options.loopStart(lastIndexNumber, number);
    log(INFO_LVL, `Set loop-start to ${number} at ${lastIndex?.index} index`)
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
      log(INFO_LVL, `Set loop-end to ${seconds} at ${lastIndex?.index} index`)
      return;
    }
    Options.loopEnd(lastIndexNumber, number);
    log(INFO_LVL, `Set loop-end to ${number} at ${lastIndex?.index} index`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a number or in ISO string format${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.sampleRate variable
 * @param {String} arg - the sample rate to set
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 * @param {String[]} newArgumentsSet - process.argv without 2 starting indexes in Set form
 */
const setSampleRate = (arg, lastIndex, newArgumentsSet) => {
  const number = Number(arg);
  if (typeof number === "number" && !arg.startsWith("-")) {
    if (testFunctions.stdout(newArgumentsSet)) {
      Options.stdoutSampleRate = number;
      log(INFO_LVL, `Set sample rate for all to ${number} because output is stdout`)
      return;
    }
    Options.sampleRate(Number(lastIndex?.index), number);
    log(INFO_LVL, `Set sample rate to ${number} at ${lastIndex?.index} index`)
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
      log(INFO_LVL, `Set verbose level asked by the user to ${number}`)
    } else log(INFO_LVL, `Set verbose level to ${number}`)
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
    case "wav": case "wave": {
      Options.format = "wave";
      log(INFO_LVL, `Set stdout format to "wave"`)
      return;
    }
    case "flac": {
      Options.format = "flac";
      log(INFO_LVL, `Set stdout format to "flac"`)
      return;
    }
    case "mp3": {
      Options.format = "mp3";
      log(INFO_LVL, `Set stdout format to "mp3"`)
      return;
    }
    case "s16le": case "f32le":
    case "pcm": {
      const formatToUse = (arg === "f32le") ? "f32le" : "pcm";
      Options.format = formatToUse;
      log(INFO_LVL, `Set stdout format to "${formatToUse}"`)
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
    log(INFO_LVL, "Set list of SoX effects as ", JSON.stringify(list))
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
    log(INFO_LVL, `Set volume to ${toPercentage} at ${lastIndex?.index} index`)
    return;
  }
  if (regexes.isPercentage.test(arg)) {
    const percentage = Number(arg.match(regexes.percentageNumber)[1]);
    Options.volume(lastIndexNumber, percentage / 100);
    log(INFO_LVL, `Set volume to ${percentage / 100} at ${lastIndex?.index} index`)
    return;
  }
  if (typeof number === "number" && !arg.startsWith("-")) {
    Options.volume(lastIndexNumber, number);
    log(INFO_LVL, `Set volume to ${number} at ${lastIndex?.index} index`)
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
    log(INFO_LVL, `Set reverb volume to ${dBNumber} and effects variable to ${lastIndex?.index}`)
    return;
  }
  if (regexes.isPercentage.test(arg)) {
    const percentage = Number(arg.match(regexes.percentageNumber)[1]);
    const toDB = 10 * 10**(percentage/100);
    Options.reverbVolume(lastIndexNumber, toDB);
    Options.effects(lastIndexNumber, []);
    log(INFO_LVL, `Set reverb volume to ${toDB} and effects variable to ${lastIndex?.index}`)
    return;
  }
  if (typeof number === "number" && !arg.startsWith("-")) {
    Options.reverbVolume(lastIndexNumber, number);
    Options.effects(Number(lastIndex?.index), []);
    log(INFO_LVL, `Set reverb volume to ${Number(arg)} and effects variable to ${lastIndex?.index}`)
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
    log(INFO_LVL, `Set max threads to ${number}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number of threads${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.textDelay variable
 * @param {String} arg - delay to set
 */
const setTextDelay = (arg) => {
  const number = Number(arg.match(regexes.textDelay).groups.number);
  // Default
  if (isNaN(number)) {
    Options.textDelay = 500;
    log(INFO_LVL, `Set text delay to ${number}`)
    return;
  }
  if (typeof number === "number" && !isNaN(number)
      && number >= 50) {
    Options.textDelay = number;
    log(INFO_LVL, `Set text delay to ${number}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid range for the text-delay${normal}`)
  process.exit(1);
}
/**
 * Sets the file path to the log file
 * @param {String} arg - Path to the log file
 */
const setLogFilePath = arg => {
  Options.logFilePath = arg ?? "./spesso.log";
  log(INFO_LVL, `Set log file path to ${arg ?? "./spesso.log"}`)
}
/**
 * Runs uninstall.mjs and uninstall spessoplayer
 */
const uninstall = async () => {
  const { execSync } = await import("child_process");
  const uninstallScriptPath = join(import.meta.dirname, "uninstall.mjs");
  const isGloballyInstalled = /spessoplayer/.test(execSync("npm ls -g").toString());

  log(INFO_LVL, `Launched ${uninstallScriptPath}`)
  try {
    execSync(`node ${uninstallScriptPath}`, {stdio: "inherit"})
  } catch (e) {
    if (e.status !== 0 && e.status !== 2) {
      console.error(`${red}Uninstallation interrupted with error ${e.status}${normal}`);
      process.exit(2);
    }
    if (e.status === 2) process.exit(2)
  }
  log(INFO_LVL, "Uninstalling spessoplayer")
  execSync(`npm uninstall ${(isGloballyInstalled) ? "-g" : ""} spessoplayer`, { cwd: ".", stdio: "inherit" })
}
/**
 * Shows the help text
 * @param {Object} [errorObject=""] - an object containing additional info that should be printed alongside help
 * @param {String} [errorObject.errorText] - error text that should be printed before helpText
 */
const help = async ({ errorText } = "") => {
  const optional = text => normal+"["+dimGray+text+normal+"]",
        grayBoldText = text => dimGrayBold+text+normal;
  let multilineMode = 0;
  const multiLine = text => {
    const lines = text.split("\n"),
          lengthOfLines = lines.length;
    for (let i = 0; i < lengthOfLines; i++) {
      lines[i] = (
        !multilineMode
          ? italics+lines[i]
          : dimGray+italics+lines[i]+normal
      );
    }
    return (multilineMode ||= 1, lines.join("\n"));
  };
  const param = (text, secondText) => {
    const length = secondText.length;
    for (let i = 0; i < length; i++) {
      text[i] &&= green+text[i]+normal;
      secondText[i] &&= green+secondText[i]+normal;
    }
    const spaceForSecondText = " ".repeat(5);
    return (
      text.join(", ") + ",\n" +
      spaceForSecondText + secondText.join(", ")
    );
  };

  const helpText = `${underline}spessoplayer${normal}
  ${grayBoldText("A midi converter that uses spessasynth_core to generate the data")}

  Usage:
    ${bold}spessoplayer ${optional("options")} <midi> <soundfont> ${optional("outFile")}

  Ways to add files:
    There are 2 main ways to add files:
      - Using the ${dimGreen}input${normal} parameter with/without an index;
      - Using the group separator (${dimGreen}\\|${normal} or ${dimGreen}"\|"${normal});

    First option is for when you need to
    really force the order of groups

    Second option is more suitable for most common cases
    and you should it try first when
    the automatic order is not good enough

    Here some examples:
    ${multiLine(
    `  song.mid song2.mid soundfontfile.sf2

      song.mid song2.mid soundfontfile.sf2
      \\| another_song.mid another_song2.mid another_soundfont.sf2

      -i song.mid -i song2.mid -i soundfontfile.sf2
      -i2 song.mid -i2 song2.mid -i2 soundfontfile.sf2`
    )}

  Available parameters:
    ${param(
      ["--input"+optional("n"), "/input"+optional("n")],
      ["-i"+optional("n"), "/i"+optional("n")]
    )}:
      ${multiLine("Takes the following file and puts it in the list by n")}

    ${param(
      ["--volume"+optional("n"), "/volume"+optional("n")],
      ["-vol"+optional("n"), "/vol"+optional("n")]
    )}:
      ${multiLine(
      `Volume to set (default: 100%)

      Available formats:
        - dB (example -10dB)
        - percentages (example 70%)
        - decimals (example 0.9)`
      )}

    ${param(
      ["--reverb-volume"+optional("n"), "/reverb-volume"+optional("n")],
      ["-rvb"+optional("n"), "/rvb"+optional("n")]
    )}:
      ${multiLine(
      `Volume to set for reverb (default: none)
      Same formats as volume`
      )}

    ${param(
      ["--effects "+grayBoldText("effects_list"),
       "/effects "+grayBoldText("effects_list")],
      ["-e "+grayBoldText("effects_list"),
       "/e "+grayBoldText("effects_list")]
    )}:
      ${multiLine('Adds any effects that SoX provides (e.g "reverb,fade 1")')}

    ${param(
      ["--loop"+optional("n"), "/loop"+optional("n")],
      ["-l"+optional("n"), "/l"+optional("n")]
    )}:
      ${multiLine(
      `Loop x amount of times (default: 0)")}
        (It might be slow with bigger numbers)`
      )}

    ${param(
      ["--loop-start"+optional("n"), "/loop-start"+optional("n")],
      ["-ls"+optional("n"), "/ls"+optional("n")]
    )}:
      ${multiLine("When the loop starts")}

    ${param(
      ["--loop-end"+optional("n"), "/loop-end"+optional("n")],
      ["-le"+optional("n"), "/le"+optional("n")]
    )}:
      ${multiLine("When the loop ends")}

    ${param(
      ["--sample-rate"+optional("n"), "/sample-rate"+optional("n")],
      ["-r"+optional("n"), "/r"+optional("n")]
    )}:
      ${multiLine(
      `Sample rate to use (default: 48000)")}
        (It might be slow with bigger numbers for players like mpv)
        (Some players might downsize it to a smaller frequency)`
      )}

    ${param(
      ["--format "+grayBoldText("format"), "/format "+grayBoldText("format")],
      ["-f "+grayBoldText("format"), "/f "+grayBoldText("format")]
    )}:
      ${multiLine(
      `Format to use for stdout (default: wav)

      Available formats:
        - wav
        - mp3
        - flac
        - pcm (f32le)`
      )}

    ${param(
      [
        "--max-threads "+grayBoldText("n"),
        "/max-threads "+grayBoldText("n"),
        "--threads "+grayBoldText("n"),
        "/threads "+grayBoldText("n")
      ],
      [
        "-mt "+grayBoldText("n"),
        "/mt "+grayBoldText("n"),
        "-T "+grayBoldText("n"),
        "/T "+grayBoldText("n")
      ]
    )}:
      ${multiLine(
      `Sets the amount of threads to use when writing to files.
      Useful when you don't have much RAM`
      )}

    ${param(["--show-usage", "/show-usage"], ["-U", "/U"])}:
      ${multiLine(
      `Shows RAM usage and CPU time.
      (Only works in file mode)`
      )}

    ${param(
      ["--text-delay"+optional("=n"), "/text-delay"+optional("=n")],
      ["-d"+optional("=n"), "/d"+optional("=n")]
    )}:
      ${multiLine(
      `Changes how fast it renders text (default: 500)
      (Only works in file mode)
      ${normal+normalYellow+italics}NOTE${dimGray}: Going below the default will hurt performance`
      )}

    ${param(["--no-progress","/no-progress"], ["-np", "/np"])}:
      ${multiLine(
      `Disables progress text rendering
      (Only works in file mode)`
      )}

    ${param(
      ["--ask", "/ask", "--confirm", "/confirm"],
      ["-a", "/a", "-c", "/c"]
    )}:
      ${multiLine("Asks for confirmation before proceeding")}

    ${param(["--no-table", "/no-table"], ["-nt", "/nt"])}:
      ${multiLine(
      `When asking for confirmation,
      it'll show the information in a JSON-like format instead of a table`
      )}

    ${param(
      [
        "--dry-run", "/dry-run",
        "--test", "/test",
        "--null", "/null"
      ],
      ["-dr", "/dr", "-t", "/t", "-0", "/0"]
    )}:
      ${multiLine(
      `Runs the program as normal but
      it'll write to /dev/null on unix and \\\\.\\nul on windows.
      Mainly used for testing purposes but
      can be useful when trying to debug with log options`
      )}

    ${param(
      ["--verbose"+optional("=n"), "/verbose"+optional("=n")],
      ["-v"+optional("=n"), "/v"+optional("=n")]
    )}:
      ${multiLine("Sets the verbosity (default: 2)")}

    ${param(
      ["--log-file"+optional("=path"), "/log-file"+optional("=path")],
      ["-lf"+optional("=path"), "/lf"+optional("=path")]
    )}:
      ${multiLine(
      `Sets path to the log file (default: ./spesso.log)
        (Meanwhile it writes to file, it also prints to stderr)`
      )}

    ${param(["--uninstall", "/uninstall"], ["-u", "/u"])}:
      ${multiLine("Uninstalls dependencies with confirmation and the entire program")}

    ${param(["--help", "/help"], ["-h", "/h", "/?"])}:
      ${multiLine("Shows this help message")}

    ${param(["--version", "/version"], ["-V", "/V"])}:
      ${multiLine("Shows the installed version")}
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

  log(INFO_LVL, `Taken version number from ${packageJSONPath}`)
  console.log(`${green + versionNumber + normal}`)
}

export {
  actUpOnPassedArgs,
  join, parse,
  Options
}

