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

import { join, parse } from "node:path"
import {
  WARNING_LVL, INFO_LVL,
  debugMaxLevel,
  formatStrings,
  fromInstant,
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
  logFile: new RegExp([
    "^(?:--log-file(?:=(?<path>\\w+))*",
    "|\\/log-file(?:=(?<path>\\w+))*",
    "|-lf(?:=(?<path>\\w+))*",
    "|\\/lf(?:=(?<path>\\w+))*)$"
  ].join("")),

  wav:  /^.*\.(?:wav|wave)$/,
  flac: /^.*\.flac$/,
  mp3:  /^.*\.mp3$/,
  raw:  /^.*\.(?:s16le|f32le|pcm)$/,
  allFO: new RegExp(`^${
    [".*\\.(?:wav|wave)",
     ".*\\.flac",
     ".*\\.mp3",
     ".*\\.(?:s16le|f32le|pcm)"].join("|")
  }$`),

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
  loopFadeStart: new RegExp([
    "^(?:--loop-fade-start(?<index>\\d+)*",
    "|\\/loop-fade-start(?<index>\\d+)*",
    "|-lFs(?<index>\\d+)*",
    "|\\/lFs(?<index>\\d+)*)$"
  ].join("")),
  loopFadeDuration: new RegExp([
    "^(?:--loop-fade-duration(?<index>\\d+)*",
    "|\\/loop-fade-duration(?<index>\\d+)*",
    "|-lFd(?<index>\\d+)*",
    "|\\/lFd(?<index>\\d+)*)$"
  ].join("")),
  loopFadeInterpolation: new RegExp([
    "^(?:--loop-fade-interpolation(?<index>\\d+)*",
    "|\\/loop-fade-interpolation(?<index>\\d+)*",
    "|-lFi(?<index>\\d+)*",
    "|\\/lFi(?<index>\\d+)*)$"
  ].join("")),

  //                           [HH:]MM:SS.sss
  ISOTimestamp: /(?<optional>(?:\d{2}:)*)*\d{2}:\d{2}(\.\d)*/,
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
  loop(set) {
    return (
      set.has("--loop")
      || set.has("/loop")
      || set.has("-l") || set.has("/l")
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
  }
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
          messageToPrint = `Can't open '${path}' because permissions aren't enough`;
          break;
        case "EISDIR":
          messageToPrint = "Can't read a directory";
          break;
        case "ENOENT":
          messageToPrint = `Can't open '${path}' because it doesn't exist`;
          break;
        case "EPERM":
          messageToPrint = `Can't read '${path}' because it requires elevated permissions to do so`;
          break;

        default:
          messageToPrint = `Quitting because ${underline+message}`;
      }
      console.error(formatStrings.errorText, messageToPrint)
      reject(process.exit(errno))
    })
  return (await readPromise)?.toString();
}
/**
 * Manages/handles verbose options
 * @param {Object} variableObj
 * @param {String} variableObj.DEBUG_LEVEL_SPESSO  terminal value for verbosity
 * @param {String} variableObj.DEBUG_FILE_SPESSO   terminal value for file path
 * @param {String} variableObj.debugLevelSpessoMsg
 * @param {String} variableObj.debugFileSpessoMsg
 * @return {Promise<Boolean|undefined>} true if verboseLevel is set, false otherwise or undefined if it has found an env variable
 */
async function manageVerboseOptions({
  DEBUG_LEVEL_SPESSO,  DEBUG_FILE_SPESSO,
  debugLevelSpessoMsg, debugFileSpessoMsg
}) {
  const newArguments = newArgs,
        newArgumentsLength = newArguments.length;
  let isVerboseLevelSet;

  // +++ verboseLevel section +++
  if (!DEBUG_LEVEL_SPESSO) verboseLevelBlock: {
    let indexOfVerboseLevel = newArguments.indexOf("-v");
    // -1 + 1 = 0, false so keep chaining
    // if not -1 then it stops chaining
    indexOfVerboseLevel+1
    || (indexOfVerboseLevel = newArguments.indexOf("--verbose"))+1
    || (indexOfVerboseLevel = newArguments.indexOf("/v"))+1
    || (indexOfVerboseLevel = newArguments.indexOf("/verbose"))+1

    if (indexOfVerboseLevel === -1) break verboseLevelBlock;

    isVerboseLevelSet = newArguments[indexOfVerboseLevel];
    const argumentOfParameter = Number(
      newArguments[indexOfVerboseLevel+1]
    );
    await setVerboseLevel(
      Number.isNaN(argumentOfParameter)
        ? undefined : argumentOfParameter
    )
  } else log(INFO_LVL, debugLevelSpessoMsg)

  // +++ logFile section +++
  for (let index = 0; index < newArgumentsLength; index++) {
    if (DEBUG_FILE_SPESSO) return log(INFO_LVL, debugFileSpessoMsg);

    const {
      [index]: argvString,
      [index]: { 0: firstChar }
    } = newArguments;
    if (firstChar !== "-" && firstChar !== "/") continue;
    if (
      !argvString.startsWith("--log-file") &&
      !argvString.startsWith("/log-file") &&
      !argvString.startsWith("-lf") &&
      !argvString.startsWith("/lf")
    ) continue;

    if (!isVerboseLevelSet) await setVerboseLevel(String(INFO_LVL))
    setLogFilePath(
      argvString
        ?.match(regexes.logFile)
          .groups
          .path
    )
    break;
  }
  return Options.verboseLevel !== undefined;
}
const setFilePromises = [];
const {
  0: WAV_INDEX,  1: RAW_INDEX,
  2: FLAC_INDEX, 3: MP3_INDEX
} = [...Array(4).keys()];
export const FO_CONSTANTS = {
  WAV_INDEX,  RAW_INDEX,
  FLAC_INDEX, MP3_INDEX
};
const newArgs = process.argv.slice(2);
/**
 * Sets necessary variables in Options class for main.mjs
 * @param {String[]} [args]              - The process.argv to analyse
 * @param {Boolean}  [isVerboseLevelSet] - if logging is enabled or not
 * @return {ChildProcess?} process that renders the loading animtion
 * @throws {ReferenceError} - if the next argument doesn't exist
 */
const actUpOnPassedArgs = async (args, isVerboseLevelSet) => {
  let lastParam,
      lastIndex;
  const newArguments = args?.slice(2) ?? newArgs,
        newArgumentsSet = new Set(newArguments),
        noDuplicates = [...newArgumentsSet.values()];
        /** @type {Map<String, (String|Symbol)>} */
  const doneFileList = new Map(newArgumentsSet.entries()),
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
  let loadingAnimation, loadingAnimationCleanupFunc;
  if (!isVerboseLevelSet) loadingAnimationBlock: {
    const isWindows  = process.platform === "win32",
          executable = !isWindows ? "sh" : "cmd.exe";
    const script = (
      !isWindows
        ? [import.meta.dirname       + "/loadingAnimation.sh" ]
        : ["/k", import.meta.dirname + "/loadingAnimation.cmd"]
    );
    loadingAnimationCleanupFunc = () => {
      // Deno.spawn throws an error when trying to close
      // an already closed process so let's ignore it
      try {
        loadingAnimation?.kill()
      } catch (error) {
        if (error.message !== "Child process has already terminated") {
          console.error(error)
        }
      }
    };
    process.on("exit", loadingAnimationCleanupFunc)
    // Deno.spawn doesn't have windowsHide
    // so use node on windows
    if (typeof Deno !== "undefined" && !isWindows) {
      loadingAnimation = Deno.spawn(executable, {
        args: script,
        stdin: "null", stdout: "null"
      });
      break loadingAnimationBlock;
    }
    const { spawn } = await import("node:child_process");
    loadingAnimation = spawn(
      executable, script,
      {stdio: ["ignore", "ignore", "inherit"], windowsHide: true}
    );
  }

  const clearLastVariables = () => {
    lastParam = undefined;
    lastIndex = undefined;
  }
  const stdoutFileModeConflictError = () => {
    console.error(
      formatStrings.errorText,
      "Can't use both stdout and file mode at the same time"
    )
    process.exit(1)
  };
  const setFileOutputs = (type, index, arg) => {
    isStdout ??= testFunctions.stdout(newArgumentsSet);
    if (isStdout) stdoutFileModeConflictError()
    Options.fileOutputs(index, arg)
    log(INFO_LVL, "Set file output to " + type)
  };
  const setLoopParameter = (
    name, arg, nextArg, regexType,
    func, nameRequired, optionsFunc
  ) => {
    loopExists ??= testFunctions.loop(newArgumentsSet);
    if (!loopExists) {
      log(WARNING_LVL, `Skipping ${name} because loop isn't set`)
      return;
    }
    lastIndex = arg.match(regexType)?.groups;
    return (
      nameRequired
        ? func.call(undefined,
          name, nextArg, lastIndex,
          optionsFunc
        )
        : func(nextArg, lastIndex)
    );
  };
  /**
   * Runs the logic that comes before setFile is run
   * @param {String} arg file to check and maybe run
   */
  const runSetFile = (arg) => {
    if (doneFileList.get(arg) === doneSymbol) return;
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
    groupSeparator &&= undefined;
  }
  const newArgumentsLength = newArguments.length;
  let isStdout, loopExists,
      indexOfSetFile = 0,
      lastAutomaticFile,
      groupSeparator;

  global.fs ??= await import("node:fs");
  const { existsSync } = fs;
  for (let i = 0; i < newArgumentsLength; i++) {
    const {
        [i]: arg,
      [i+1]: nextArg
    } = newArguments;

    switch (arg) {
      // Skip verboseLevel, logFilePath
      // and spessasynthLogging flags
      case "--verbose":  case "/verbose":
      case "-v":         case "/v": {
        const nextArgument = Number(nextArg);
        // If it also has been provided a valid argument
        if (!Number.isNaN(nextArgument)) i++
        break;
      }
      case "--log-file": case "/log-file":
      case "-lf":        case "/lf":
      case regexes.logFile.test(arg) && arg: break;
      case "--enable-spessasynth-logging":
      case "--enable-spessasynth-warn-logging":
      case "--enable-spessasynth-info-logging": break;

      case (
        (lastParam === "input" || !lastParam) &&
        !regexes.allFO.test(arg) && existsSync(arg) && arg
      ): {
        runSetFile(arg)

        if (
          !nextArg ||
          nextArg    === "|" ||
          nextArg[0] === "-" ||  // Parameters
          nextArg[0] === "/" ||
          regexes.allFO.test(nextArg) // File output
        ) break;
        if (!existsSync(nextArg)) { i++; break; }

        runSetFile(nextArg); i++
        break;
      }

      case "|": { groupSeparator = true; break; }
      case "-": {
        if (Options.isFileMode()) stdoutFileModeConflictError()
        Options.toStdout = true;
        log(INFO_LVL, "Set stdout mode")
        break;
      }
      case "out.wav":
      case regexes.wav.test(arg) && arg: {
        setFileOutputs("wav", WAV_INDEX, arg)
        break;
      }
      case "out.pcm": case "out.s16le": case "out.f32le":
      case regexes.raw.test(arg) && arg: {
        setFileOutputs("pcm", RAW_INDEX, arg)
        break;
      }
      case "out.flac":
      case regexes.flac.test(arg) && arg: {
        setFileOutputs("flac", FLAC_INDEX, arg)
        break;
      }
      case "out.mp3":
      case regexes.mp3.test(arg) && arg: {
        setFileOutputs("mp3", MP3_INDEX, arg)
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
        Options.dryRun()
        log(INFO_LVL, "Set dry-run mode")
        break;
      }
      case "--max-threads": case "/max-threads":
      case "--threads":     case "/threads":
      case "-mt":           case "/mt":
      case "-T":            case "/T": {
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        if (!isStdout) {
          setMaxThreads(nextArg)
        } else {
          log(WARNING_LVL,
            "Ignoring threads flag since stdout mode is enabled"
          )
        }
        i++
        break;
      }
      case "--show-usage": case "/show-usage":
      case "-U":           case "/U": {
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        if (!isStdout) {
          Options.showUsage = true;
          log(INFO_LVL, "Set show-usage flag")
          break;
        }
        log(WARNING_LVL,
          "Ignored show-usage flag since stdout mode is enabled"
        )
        break;
      }
      // Stdout format must be of only 1 kind
      // otherwise players like mpv won't read the output correctly
      case "--format": case "/format":
      case "-f":       case "/f": {
        setFormat(nextArg); i++
        break;
      }
      case "--progress-delay": case "/progress-delay":
      case "-d":               case "/d": {
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        if (!isStdout) {
          setProgressDelay(nextArg)
          i++; break;
        }
        log(WARNING_LVL,
          "Ignored progress-delay flag since stdout mode is enabled"
        )
        // In case the user passed a number
        if (!Number.isNaN(Number(nextArg))) i++
        break;
      }
      case "--input": case "/input":
      case "-i":      case "/i":
      case regexes.input.test(arg) && arg: {
        if (
          !nextArg ||
          nextArg    === "|" ||
          nextArg[0] === "-" ||       // Parameters
          nextArg[0] === "/" ||
          regexes.allFO.test(nextArg) // File output
        ) {
          console.error(
            formatStrings.errorText,
            "Missing a necessary argument"
          )
          process.exit(1)
        }
        lastParam = "input";
        lastIndex = arg.match(regexes.input)?.groups;
        if (!existsSync(nextArg)) { i++; break; }

        runSetFile(nextArg); i++
        break;
      }
      case "--volume": case "/volume":
      case "-vol":     case "/vol":
      case regexes.volume.test(arg) && arg: {
        lastIndex = arg.match(regexes.volume)?.groups;
        setVolumeParameter(
          "volume", nextArg, lastIndex,
          Options.volume
        )
        i++; break;
      }
      case "--sample-rate": case "/sample-rate":
      case "-r":            case "/r":
      case regexes.sampleRate.test(arg) && arg: {
        lastIndex = arg.match(regexes.sampleRate)?.groups;
        setSampleRate(nextArg, lastIndex, newArgumentsSet)
        i++
        break;
      }
      case "--reverb-volume": case "/reverb-volume":
      case "-rvb":            case "/rvb":
      case regexes.reverbVolume.test(arg) && arg: {
        lastIndex = arg.match(regexes.reverbVolume)?.groups;
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        const isExternal = Options.externalEffectProcesser(
          Number(lastIndex?.index), isStdout
        );
        if (isExternal === true) {
          log(WARNING_LVL,
            "Ignored reverb-volume flag at index " +
             lastIndex?.index + " since effects flag has been used"
          )
          i++; break;
        }
        setVolumeParameter(
          "reverb-volume", nextArg, lastIndex,
          Options.reverbVolume
        )
        i++; break;
      }
      case "--effects": case "/effects":
      case "-e":       case "/e":
      case regexes.effects.test(arg) && arg: {
        lastIndex = arg.match(regexes.effects)?.groups;
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        const isExternal = Options.externalEffectProcesser(
          Number(lastIndex?.index), isStdout
        );
        if (isExternal === false) {
          log(WARNING_LVL,
            "Ignored effects flag at index " + lastIndex?.index
            + " since a builtin effect option has been used " +
              "(e.g. reverb-volume)"
          )
          i++; break;
        }
        setEffects(nextArg, lastIndex, newArgumentsSet)
        i++
        break;
      }
      case "--loop": case "/loop":
      case "-l":     case "/l":
      case regexes.loop.test(arg) && arg: {
        lastIndex = arg.match(regexes.loop)?.groups;
        setLoopParameterValue(
          "loop", nextArg, lastIndex,
          Options.loopAmount
        )
        i++; break;
      }
      case "--loop-start": case "/loop-start":
      case "-ls":          case "/ls":
      case regexes.loopStart.test(arg) && arg: {
        setLoopParameter(
          "loop-start",
          arg, nextArg, regexes.loopStart,
          setLoopParameterTimeValue,
          true, Options.loopStart
        )
        i++; break;
      }
      case "--loop-end": case "/loop-end":
      case "-le":        case "/le":
      case regexes.loopEnd.test(arg) && arg: {
        setLoopParameter(
          "loop-end",
          arg, nextArg, regexes.loopEnd,
          setLoopParameterTimeValue,
          true, Options.loopEnd
        )
        i++; break;
      }
      case "--loop-fade": case "/loop-fade":
      case "-lF":         case "/lF": {
        loopExists ??= testFunctions.loop(newArgumentsSet);
        if (!loopExists) {
          log(WARNING_LVL,
            "Skipping loop-fade because loop isn't set"
          )
          break;
        }
        Options.loopFade = true;
        log(INFO_LVL, "Set loop-fade flag")
        break;
      }
      case "--loop-fade-start": case "/loop-fade-start":
      case "-lFs":              case "/lFs":
      case regexes.loopFadeStart.test(arg) && arg: {
        setLoopParameter(
          "loop-fade-start",
          arg, nextArg, regexes.loopFadeStart,
          setLoopParameterValue,
          true, Options.loopFadeStart
        )
        i++; break;
      }
      case "--loop-fade-duration": case "/loop-fade-duration":
      case "-lFd":                 case "/lFd":
      case regexes.loopFadeDuration.test(arg) && arg: {
        setLoopParameter(
          "loop-fade-duration",
          arg, nextArg, regexes.loopFadeDuration,
          setLoopParameterValue,
          true, Options.loopFadeDuration
        )
        i++; break;
      }
      case "--loop-fade-interpolation":
      case "/loop-fade-interpolation":
      case "-lFi": case "/lFi":
      case regexes.loopFadeInterpolation.test(arg) && arg: {
        setLoopParameter(
          "loop-fade-interpolation",
          arg, nextArg, regexes.loopFadeInterpolation,
          setLoopFadeInterpolation
        )
        i++; break;
      }

      default:
        if (!isVerboseLevelSet) {
          loadingAnimation?.kill()
          process.stderr.write("\x1b[K")
        }
        await help({
          errorText: red+`'${
            underline+dimRed +
            arg +
            normal+red
          }' is an invalid parameter`+normal+"\n"
        })
        process.exit()
    }
    if (lastParam || lastIndex) clearLastVariables()
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
    console.error(
      formatStrings.errorText,
      "Missing required files"
    )
    process.exit(1)
  }
  return [loadingAnimation, loadingAnimationCleanupFunc];
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
    /**
     * Generates a generic log message
     * @param {Boolean} type    file type
     * @param {String}  msgArg  filename
     * @param {Number}  [index] group index of the file
     * @inner
     * @private
     * @memberof module:cli
     * @return {String} generic log message
     */
    getMessage(type, msgArg, index) {
      const typeOfFile = type ? "midi" : "soundfont";
      return `Set ${typeOfFile} file to "${msgArg}" at index ${index}`;
    },
    /**
     * Generates a log message replacer
     * @param {String} original original soundfont
     * @param {String} newOne   new soundfont
     * @param {Number} [index]  group index of the file
     * @inner
     * @private
     * @memberof module:cli
     * @return {String} log message replacer
     */
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
      Options.files(foundIndex, arg, !typeOfFile)
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
    Options.files(lastKnownGroupIndex, arg, !typeOfFile)
    log(INFO_LVL, logMessages.getMessage(typeOfFile, arg, lastKnownGroupIndex))
  });
  // --- END of automatic addition of files section ---
}
/**
 * Checks if the given number is an actual number
 * @param {*} number the value to check
 * @param {Boolean} [checkForInfinity] if it's also not Infinity
 * @return {Boolean} if it's an actual number or not
 */
const isRealNumber = (number, checkForInfinity) => {
  const isNumber = typeof number === "number" && !Number.isNaN(number);
  return (
    checkForInfinity
      ? isNumber && number !== Infinity
      : isNumber
  );
};
/**
 * Translates the given strings into useful values
 * @param {String} arg argument of the parameter
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 * @return {Object} infos about the argument
 */
const getArgInfos = (arg, lastIndex) => ({
  number: Number(arg),
  lastIndexNumber: Number(lastIndex?.index),
  lastIndexString: lastIndex?.index ?? "0"
});
const maybeTruncate = string => (
  string.length > 20
    ? string.substring(0, 20) + "..."
    : string
);
// Error/invalid strings/messages
const invalidNumberString       = "isn't a valid number",
      invalidNumberOrISOString  = "isn't a valid number or a valid ISO time format string",
      negativeNumberErrorString = "must be above or equal to 0",
      invalidVolumeString       = "isn't a valid number/dB/percentage";

/**
 * Sets a loop parameter value for:
 * - loop;
 * - loop-fade-start;
 * - loop-fade-duration;
 * @param {String}   name name of the parameter
 * @param {String}   arg  value of the parameter
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 * @param {Function} func Options' dedicated parameter function
 */
const setLoopParameterValue = (name, arg, lastIndex, func) => {
  const argInfos = getArgInfos(arg, lastIndex);
  const { lastIndexNumber, lastIndexString } = argInfos;
  let number = argInfos.number;

  // loop-fade-start only
  if (name === "loop-fade-start" && Number.isNaN(number)) {
    func.call(Options, lastIndexNumber, 1)
    log(INFO_LVL, `Set ${name} to 1 at ${lastIndex?.index} index`)
    return;
  }
  // Negative conversion
  if (number < 0) {
    log(WARNING_LVL,
      `Converted ${
        underline+number+endUnderline
      } to 0 because it was negative`
    )
    number = 0;
  }

  if (number === Infinity) {
    console.error(
      formatStrings.failedCliParam,
      `[${name}|${lastIndexString}]: Can't use infinity, sorry`
    )
    process.exit(1)
  }
  if (isRealNumber(number)) {
    func.call(Options, lastIndexNumber, number)
    log(INFO_LVL, `Set ${name} to ${number} at ${lastIndex?.index} index`)
    return;
  }
  console.error(
    formatStrings.failedCliParamWithArg,
    `[${name}|${lastIndexString}]:`,
    maybeTruncate(arg), invalidNumberString
  )
  process.exit(1)
}
/**
 * Sets the Options.loopFadeInterpolation variable
 * @param {String} arg - the loop fade duration amount in seconds
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 */
const setLoopFadeInterpolation = (arg, lastIndex) => {
  const argInfos = getArgInfos(arg, lastIndex);
  const { number, lastIndexNumber, lastIndexString } = argInfos;

  // Out of range error check
  if (number < 0 || number > 3) {
    console.error(
      formatStrings.failedCliParamWithArg,
      `[loop-fade-interpolation|${lastIndexString}]:`,
      maybeTruncate(arg),
      "is out of range of valid interpolation types"
    )
  }

  let type;
  switch (arg) {
    case "linear": case "1":
      type = "linear";
      break;
    case "sine":   case "2":
      type = "sine";
      break;
    case "quad":   case "3":
      type = "quad";
      break;

    default:
      console.error(
        formatStrings.failedCliParamWithArg,
        `[loop-fade-interpolation|${lastIndexString}]:`,
        maybeTruncate(arg), "is an invalid interpolation type"
      )
      process.exit(1)
  }
  Options.loopFadeInterpolation(lastIndexNumber, type)
  log(INFO_LVL, `Set loop-fade-interpolation to ${arg} at ${lastIndex?.index} index`)
}
/**
 * Sets a loop parameter that uses seconds or a time format
 * @param {String}   name name of the parameter
 * @param {String}   arg  value of the parameter
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 * @param {Function} func Options' dedicated parameter function
 */
const setLoopParameterTimeValue = (name, arg, lastIndex, func) => {
  const {
    number, lastIndexNumber, lastIndexString
  } = getArgInfos(arg, lastIndex);

  const timeStampMatch = arg.match(regexes.ISOTimestamp);
  if (timeStampMatch) {
    // ISO Time format checks
    const {
      groups: {optional: optionalTime}
    } = timeStampMatch;
    if (optionalTime?.length > 3) {
      console.error(
        formatStrings.failedCliParamWithArg,
        `[${name}|${lastIndexString}]:`,
        maybeTruncate(arg), "isn't a valid ISO time string"
      )
      process.exit(1)
    }
    if (!optionalTime) arg = "00:"+arg;

    // Format translation to seconds
    let argAsADate = fromInstant?.(`1970-01-01T${arg}Z`).epochMilliseconds;
    argAsADate ??= Date.parse(`1970T${arg}Z`);

    const seconds = argAsADate / 1000;
    func.call(Options, lastIndexNumber, seconds)
    log(INFO_LVL, `Set ${name} to ${seconds} at ${lastIndex?.index} index`)
    return;
  }
  if (isRealNumber(number, true) && !(number < 0)) {
    func.call(Options, lastIndexNumber, number)
    log(INFO_LVL, `Set ${name} to ${number} at ${lastIndex?.index} index`)
    return;
  }
  console.error(
    formatStrings.failedCliParamWithArg,
    `[${name}|${lastIndexString}]:`,
    maybeTruncate(arg), invalidNumberOrISOString
  )
  process.exit(1)
}
/**
 * Sets the Options.sampleRate variable
 * @param {String} arg - the sample rate to set
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 * @param {Set<string>} newArgumentsSet - process.argv without 2 starting indexes in Set form
 */
const setSampleRate = (arg, lastIndex, newArgumentsSet) => {
  const {
    number, lastIndexNumber, lastIndexString
  } = getArgInfos(arg, lastIndex);

  if (number < 0) {
    console.error(
      formatStrings.failedCliParam,
      `[sample-rate|${lastIndexString}]: ${negativeNumberErrorString}`
    )
    process.exit(1)
  }
  if (isRealNumber(number, true)) {
    if (testFunctions.stdout(newArgumentsSet)) {
      Options.stdoutSampleRate = number;
      log(INFO_LVL, `Set sample-rate for all to ${number} because output is stdout`)
      return;
    }
    Options.sampleRate(lastIndexNumber, number)
    log(INFO_LVL, `Set sample-rate to ${number} at ${lastIndex?.index} index`)
    return;
  }
  console.error(
    formatStrings.failedCliParamWithArg,
    `[sample-rate|${lastIndexString}]:`, maybeTruncate(arg),
    invalidNumberString
  )
  process.exit(1)
}
/**
 * Simply changes how the program should log
 * @param {String} arg - the level of how much it should log
 */
const setVerboseLevel = async (arg) => {
  const isFromUser = arg !== undefined;
  // Default
  arg ??= INFO_LVL;
  const number = Number(arg);
  global.fs ??= await import("node:fs");

  if (
    isRealNumber(number)
    && !(number < 0 && number > debugMaxLevel)
  ) {
    Options.verboseLevel = number;
    if (isFromUser) {
      log(INFO_LVL,
        `Set verbose level asked by the user to ${number}`
      )
    } else log(INFO_LVL, `Set verbose level to ${number}`)
    return;
  }
  console.error(
    formatStrings.failedCliParamWithArg,
    "[verbose]:", maybeTruncate(arg), invalidNumberString
  )
  process.exit(1)
}
/**
 * Sets the Options.format variable for use in stdout mode
 * @param {String} arg - the format to use (similar to ffmpeg's -f)
 */
const setFormat = arg => {
  switch (arg) {
    case "wav": case "wave": {
      Options.format = "wave";
      log(INFO_LVL, "Set stdout format to 'wave'")
      return;
    }
    case "flac":
    case "mp3": {
      Options.format = arg;
      log(INFO_LVL, `Set stdout format to '${arg}'`)
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
  console.error(
    formatStrings.failedCliParamWithArg,
    "[format]:", maybeTruncate(arg), "isn't a valid format"
  )
  process.exit(1)
}
/**
 * Applies effects from the user's string passed through --effects
 * @param {String} arg - the comma-separeted string to parse
 * @param {Set<string>} newArgumentsSet - process.argv without 2 starting indexes in Set form
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 */
const setEffects = (arg, lastIndex, newArgumentsSet) => {
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
    // Is it a list structured like
    //   <effect1>[values1],<effect2>[values2]?
    normalList: new RegExp(`${regexGroupListGetter.source},${regexGroupListGetter.source}`).test(arg),
    // Is it a single effect like
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

    if (
      !list.every(i => new RegExp(regexListOfEffects).test(i.effect))
    ) {
      console.error(
        formatStrings.failedCliParamWithArg,
        "[effects]: One effect inside", `"${maybeTruncate(arg)}"`,
        "doesn't exist in SoX"
      )
      process.exit(1)
    }

    if (testFunctions.stdout(newArgumentsSet)) {
      Options.stdoutEffects = list;
    } else {
      Options.effects(Number(lastIndex?.index), list)
    }
    log(INFO_LVL, "Set list of SoX effects as ", JSON.stringify(list))
    return;
  }
  console.error(
    formatStrings.failedCliParamWithArg,
    "[effects]:", `"${maybeTruncate(arg)}"`, "is a malformed string"
  )
  process.exit(1)
}
/**
 * Sets a volume parameter
 * @param {String}   name name of the parameter
 * @param {String}   arg  value of the parameter
 * @param {module:typeDefinitions~lastIndexGroupObject} lastIndex
 * @param {Function} func Options' dedicated parameter function
 */
const setVolumeParameter = (name, arg, lastIndex, func) => {
  const {
    number, lastIndexNumber, lastIndexString
  } = getArgInfos(arg, lastIndex);

  if (regexes.areDecibels.test(arg)) {
    const dB = Number(arg.match(regexes.decibelNumber)[1]);
    const dBNumber = 10**(dB/(name === "volume" ? 10 : 20));

    func.call(Options, lastIndexNumber, dBNumber)
    log(INFO_LVL, `Set ${name} to ${dBNumber} at ${lastIndex?.index} index`)
    return;
  }
  if (regexes.isPercentage.test(arg)) {
    const percentage = Number(arg.match(regexes.percentageNumber)[1]);
    const toFloat = percentage / 100;

    func.call(Options, lastIndexNumber, toFloat)
    log(INFO_LVL, `Set ${name} to ${toFloat} at ${lastIndex?.index} index`)
    return;
  }
  // Negative conversion
  if (number < 0) {
    console.error(
      formatStrings.failedCliParamWithArg,
      `[${name}|${lastIndexString}]:`, maybeTruncate(arg),
      negativeNumberErrorString
    )
    process.exit(1)
  }
  if (isRealNumber(number, true)) {
    func.call(Options, lastIndexNumber, number)
    log(INFO_LVL, `Set ${name} to ${number} at ${lastIndex?.index} index`)
    return;
  }
  console.error(
    formatStrings.failedCliParamWithArg,
    `[${name}|${lastIndexString}]:`, maybeTruncate(arg),
    invalidVolumeString
  )
  process.exit(1)
}
/**
 * Sets the Options.maxThreads variable
 * @param {String} arg - number of threads to set
 */
const setMaxThreads = async (arg) => {
  const number = Number(arg);
  if (
    isRealNumber(number)
    && number <= (await import("node:os")).availableParallelism() * 2
    && number >= 1
  ) {
    Options.maxThreads = number;
    log(INFO_LVL, `Set max-threads to ${number}`)
    return;
  }
  console.error(
    formatStrings.failedCliParamWithArg,
    "[max-threads]:", maybeTruncate(arg),
    "is out of range of valid numbers of threads"
  )
  process.exit(1)
}
/**
 * Sets the Options.progressDelay variable
 * @param {String} arg - delay to set
 */
const setProgressDelay = (arg) => {
  const number = Number(arg);

  // Default
  if (Number.isNaN(number)) {
    Options.progressDelay = 500;
    log(INFO_LVL, `Set progress-delay to 500`)
    return;
  }
  if (isRealNumber(number, true) && number >= 50) {
    Options.progressDelay = number;
    log(INFO_LVL, `Set progress-delay to ${number}`)
    return;
  }
  console.error(
    formatStrings.failedCliParamWithArg,
    "[progress-delay]:", maybeTruncate(arg),
    "is out of range of valid numbers of milliseconds"
  )
  process.exit(1)
}
/**
 * Sets the file path to the log file
 * @param {String} arg - Path to the log file
 */
const setLogFilePath = arg => {
  const pathToUse = arg || "./spesso.log";
  Options.logFilePath = pathToUse;
  log(INFO_LVL, `Set log-file path to ${pathToUse}`)
}
/**
 * Runs uninstall.mjs and uninstall spessoplayer
 */
const uninstall = async () => {
  const { execSync } = await import("node:child_process");
  const uninstallScriptPath = join(import.meta.dirname, "uninstall.mjs");
  const isGloballyInstalled = /spessoplayer/.test(execSync("npm ls -g").toString());

  try {
    log(INFO_LVL, `Launched ${uninstallScriptPath}`)
    execSync(`node ${uninstallScriptPath}`, {stdio: "inherit"})
  } catch ({status}) {
    switch (status) {
      case 0: break;
      case 2: process.exit(status); break;

      default:
        console.error(
          formatStrings.errorText,
          `[uninstall]: Uninstallation interrupted with error ${status}`
        )
        process.exit(status)
    }
  }
  log(INFO_LVL, "Uninstalling spessoplayer")
  execSync(
    `npm uninstall ${isGloballyInstalled ? "-g" : ""} spessoplayer`,
    { cwd: ".", stdio: "inherit" }
  )
}
/**
 * Shows the help text
 * @param {Object} [errorObject=""] - an object containing additional info that should be printed alongside help
 * @param {String} [errorObject.errorText=""] - error text that should be printed before helpText
 */
const help = async ({ errorText = "" } = "") => {
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

  Parameter Indexes:
    Each parameter can take an optional index
    that points to each song's index (${optional("n")})

    The only exception is the input parameter
    which instead points to a group index
    (e.g. midi.mid and sf.sf2 as group 0 and so on)

    If no index is provided, it can be:
      ${underline}0${normal} or the ${underline}last index${normal} of the parameter

    ${normalYellow+italics}NOTE${normal}: Some options in stdout mode don't let you
    choose an index because it'd break audio players,
    like for example sample-rate

  Available parameters:
    ${param(
      ["--input"+optional("n")+" "+grayBoldText("file"),
       "/input"+optional("n")+" "+grayBoldText("file")],
      ["-i"+optional("n")+" "+grayBoldText("file"),
       "/i"+optional("n")+" "+grayBoldText("file")]
    )}:
      ${multiLine("Takes the following file and puts it in the list by n")}

    ${param(
      ["--volume"+optional("n")+" "+grayBoldText("amount"),
       "/volume"+optional("n")+" "+grayBoldText("amount")],
      ["-vol"+optional("n")+" "+grayBoldText("amount"),
       "/vol"+optional("n")+" "+grayBoldText("amount")]
    )}:
      ${multiLine(
      `Volume to set (default: 100%)

      Available formats:
        - dB (example -10dB)
        - percentages (example 70%)
        - decimals (example 0.9)`
      )}

    ${param(
      ["--reverb-volume"+optional("n")+" "+grayBoldText("amount"),
       "/reverb-volume"+optional("n")+" "+grayBoldText("amount")],
      ["-rvb"+optional("n")+" "+grayBoldText("amount"),
       "/rvb"+optional("n")+" "+grayBoldText("amount")]
    )}:
      ${multiLine(
      `Volume to set for reverb
      Same formats as volume but with different results
      because it's a builtin effect
        (confilcts with --effects) (default: none)`
      )}

    ${param(
      ["--effects "+grayBoldText("effects_list"),
       "/effects "+grayBoldText("effects_list")],
      ["-e "+grayBoldText("effects_list"),
       "/e "+grayBoldText("effects_list")]
    )}:
      ${multiLine('Adds any effects that SoX provides (e.g "reverb,fade 1")')}

    ${param(
      ["--loop"+optional("n")+" "+grayBoldText("seconds"),
        "/loop"+optional("n")+" "+grayBoldText("seconds")],
      ["-l"+optional("n")+" "+grayBoldText("seconds"),
       "/l"+optional("n")+" "+grayBoldText("seconds")]
    )}:
      ${multiLine(
      `Loop x amount of times (default: 0)
        (It might be slow with bigger numbers)`
      )}

    ${param(
      ["--loop-start"+optional("n")+" "+grayBoldText("seconds"),
        "/loop-start"+optional("n")+" "+grayBoldText("seconds")],
      ["-ls"+optional("n")+" "+grayBoldText("seconds"),
       "/ls"+optional("n")+" "+grayBoldText("seconds")]
    )}:
      ${multiLine(`The loop will start after ${grayBoldText("seconds")}`)}

    ${param(
      ["--loop-end"+optional("n")+" "+grayBoldText("seconds"),
       "/loop-end"+optional("n")+" "+grayBoldText("seconds")],
      ["-le"+optional("n")+" "+grayBoldText("seconds"),
       "/le"+optional("n")+" "+grayBoldText("seconds")]
    )}:
      ${multiLine(
      `The loop will restart at ${optional("-")+grayBoldText("seconds")+dimGray+italics} from the end`
      )}

    ${param(["--loop-fade", "/loop-fade"], ["-lF", "/lF"])}:
      ${multiLine(
      `It does 1 more loop on top of yours
      and then it fades away slowly based on loop-fade-start
        (Doesn't work without the loop parameter turned on)`
      )}

    ${param(
      ["--loop-fade-start"+optional("n")+" "+grayBoldText("seconds"),
       "/loop-fade-start"+optional("n")+" "+grayBoldText("seconds")],
      ["-lFs"+optional("n")+" "+grayBoldText("seconds"),
       "/lFs"+optional("n")+" "+grayBoldText("seconds")]
    )}:
      ${multiLine(
      "When the loop fade starts (default: 1)"
      )}

    ${param(
      ["--loop-fade-duration"+optional("n")+" "+grayBoldText("seconds"),
       "/loop-fade-duration"+optional("n")+" "+grayBoldText("seconds")],
      ["-lFd"+optional("n")+" "+grayBoldText("seconds"),
       "/lFd"+optional("n")+" "+grayBoldText("seconds")]
    )}:
      ${multiLine(
      "How much the loop fade should last (default: 4)"
      )}

    ${param(
      ["--loop-fade-interpolation"+optional("n")+" "+grayBoldText("type"),
       "/loop-fade-interpolation"+optional("n")+" "+grayBoldText("type")],
      ["-lFi"+optional("n")+" "+grayBoldText("type"),
       "/lFi"+optional("n")+" "+grayBoldText("type")]
    )}:
      ${multiLine(
      `What type of interpolation to use for loop-fade
      (default: linear, 1)

      Available fomrats:
        - linear, 1
        - sine,   2
        - quad,   3`
      )}

    ${param(
      ["--sample-rate"+optional("n")+" "+grayBoldText("samples"),
       "/sample-rate"+optional("n")+" "+grayBoldText("samples")],
      ["-r"+optional("n")+" "+grayBoldText("samples"),
       "/r"+optional("n")+" "+grayBoldText("samples")]
    )}:
      ${multiLine(
      `Sample rate to use (default: 48000)
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
      ["--progress-delay "+grayBoldText("milliseconds"),
       "/progress-delay "+grayBoldText("milliseconds")],
      ["-d "+grayBoldText("milliseconds"), "/d "+grayBoldText("milliseconds")]
    )}:
      ${multiLine(
      `Changes how fast it renders text (default: 500ms)
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
      ["--verbose "+grayBoldText("n"), "/verbose "+grayBoldText("n")],
      ["-v "+grayBoldText("n"), "/v "+grayBoldText("n")]
    )}:
      ${multiLine("Sets the verbosity (default: 2)")}

    ${green}--enable-spessasynth${optional("-warn|-info")+green}-logging${normal}:
      ${multiLine(
      `Enables spessasynth's logging system,
      basically only used for debugging.

      It can be used in 2 ways:
        - Info and warn enabled
        - Only 1 of the two types enabled`
      )}

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
  `;

  const { env: { PAGER } } = process;
  if (!PAGER) {
    if (errorText) console.error(errorText)
    return console.log(helpText);
  }

  // Cleans up potential loading text
  process.stderr.write("\x1b[K")
  const { spawnSync } = await import("node:child_process");
  const PAGERArguments = PAGER.trim().split(/ +/),
        [PAGERCommand] = PAGERArguments.splice(0, 1);

  spawnSync(
    PAGERCommand, PAGERArguments,
    {
      stdio: ["pipe", "inherit", "inherit"],
      input: (errorText && errorText+"\n")+helpText
    }
  )
}
/**
 * Shows the version number taken from package.json
 */
const version = async () => {
  const fs = await import("node:fs");
  const packageJSONPath = join(import.meta.dirname, "package.json");
  const { version: versionNumber } = JSON.parse(fs.readFileSync(packageJSONPath).toString());

  log(INFO_LVL, `Taken version number from ${packageJSONPath}`)
  //             ↓ Cleans up potential loading text
  console.log(`\x1b[K${green + versionNumber + normal}`)
}

export {
  manageVerboseOptions,
  actUpOnPassedArgs,
  join, parse,
  Options
}

