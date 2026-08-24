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

import {
  WARNING_LVL, INFO_LVL,
  debugMaxLevel,
  formatStrings,
  fromInstant,
  log, Options, sep
} from "./utils/utils.mjs"

function endsWithSupportedExtension(arg) {
  return (
       arg.endsWith(".opus")  || arg.endsWith(".mp3" )
    || arg.endsWith(".wav" )  || arg.endsWith(".wave")
    || arg.endsWith(".flac")
    || arg.endsWith(".pcm" )
    || arg.endsWith(".s16le") || arg.endsWith(".f32le")
  );
}
const regexes = {
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
          messageToPrint = `Can't open '${dimRed+path+red}' because permissions aren't enough`;
          break;
        case "EISDIR":
          messageToPrint = `Can't directly read directory '${dimRed+path+red}'`;
          break;
        case "ENOENT":
          messageToPrint = `Can't open '${dimRed+path+red}' because it doesn't exist`;
          break;
        case "EPERM":
          messageToPrint = `Can't read '${dimRed+path+red}' because it requires elevated permissions to do so`;
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
  const newArguments = newArgs;
  let isVerboseLevelSet,
      newArgumentsLength = newArguments.length;

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
    const indexOfNextArg = indexOfVerboseLevel+1;
    const argumentOfParameter = Number(
      newArguments[indexOfNextArg]
    );
    const notANumber = Number.isNaN(argumentOfParameter);
    await setVerboseLevel(
      !notANumber
        ? (delete newArguments[indexOfNextArg], argumentOfParameter)
        : undefined
    )
    newArguments.splice(indexOfVerboseLevel, notANumber ? 1 : 2)
  } else log(INFO_LVL, debugLevelSpessoMsg)

  // +++ logFile section +++
  if (DEBUG_FILE_SPESSO) return log(INFO_LVL, debugFileSpessoMsg);
  newArgumentsLength = newArguments.length;
  let indexOfEqualSign;
  for (let index = 0; index < newArgumentsLength; ++index) {
    const {
      [index]: argvString,
      [index]: { 0: firstChar } = 0
    } = newArguments;
    if (!argvString) continue;

    if (firstChar !== "-" && firstChar !== "/") continue;
    if (
      !(argvString.startsWith("--log-file") && (indexOfEqualSign = 10)) &&
      !(argvString.startsWith("/log-file" ) && (indexOfEqualSign = 9 )) &&
      !(argvString.startsWith("-lf") && (indexOfEqualSign = 3)) &&
      !(argvString.startsWith("/lf") && (indexOfEqualSign = 3))
    ) continue;

    if (!isVerboseLevelSet) await setVerboseLevel(String(INFO_LVL))
    setLogFilePath(
      argvString[indexOfEqualSign] !== undefined
        ? argvString.slice(indexOfEqualSign + 1)
        : undefined
    )
    newArguments.splice(index, 1)
    break;
  }
  return [
    Options.getValue("verboseLevel") !== undefined,
    newArguments
  ];
}
const setFilePromises = [];
export const FO_CONSTANTS = {
  WAV_INDEX:  0, RAW_INDEX: 1,
  FLAC_INDEX: 2, MP3_INDEX: 3, OPUS_INDEX: 4
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
        newArgumentsSet = new Set(newArguments);

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

  /**
   * Checks if the argument has an index attached to it
   * and maybe updates lastIndex variable with its index
   * then gives back just the basic name of the parameter
   * @param {String} arg      argument to check
   * @return {(String|false)} parameter's name without initials and index
   *                          or false if it's not a valid parameter
   */
  const manageParam = arg => {
    const noInitials = (
      arg[0] === "-" && arg.slice(arg[1] === "-" ? 2 : 1)
    ) || (
      arg[0] === "/" &&
      process.platform === "win32" && arg.slice(1)
    );
    if (!noInitials) return noInitials;

    const index = noInitials.lastIndexOf(":");
    return (
      index > 0
        ? noInitials.slice(
            //                        excludes : ↓
          0, (lastIndex = noInitials.slice(index+1), index)
        )
        : noInitials
    );
  };
  const clearLastVariables = () => {
    lastParam = undefined;
    lastIndex = undefined;
  };
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
    if (Options.getValue("daemon")) {
      log(WARNING_LVL,
        `Ignoring ${arg} since daemon mode is enabled`
      )
      return;
    }
    Options.addIndexedStringValue("fileOutputs", index, arg)
    log(INFO_LVL, "Set file output to " + type)
  };
  /**
   * Handles loop parameters
   * that use time values or just numbers
   * @param {String}   name           name of the loop parameter
   * @param {String}   nextArg        argument that comes right after arg
   * @param {Function} func           function that has to be run for setting the value
   * @param {Boolean}  [nameRequired] if it's needed to pass the Options' method
   * @param {Function} [optionsFunc]  Options' method
   */
  const setLoopParameter = (
    name, nextArg, func,
    nameRequired, optionsFunc
  ) => {
    loopExists ??= testFunctions.loop(newArgumentsSet);
    if (!loopExists) {
      log(WARNING_LVL, `Skipping ${name} because loop isn't set`)
      return;
    }
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
  const runSetFile = arg => {
    if (doneFileList[arg] === doneSymbol
        && lastParam !== "input") return;
    doneFileList[arg] = doneSymbol;

    setFilePromises.push(
      setFile({
        indexOfSetFile: indexOfSetFile++,
        extLessFiles,
        lastParam, lastIndex,
        groupSeparator,
        lastAutomaticFile, arg
      })
    )
    if (!lastParam) lastAutomaticFile = arg;
    groupSeparator &&= undefined;
  };
  /** @type {Object<String, Symbol>} */
  const doneFileList = Object.create(null),
        doneSymbol = Symbol("ALREADY_DONE");

  /** @type {Object<String, Number>} */
  const extLessFiles = Object.create(null);
  {
    // Loads extLessFiles with only basenames of the files.
    // Also code block just because of length variable
    const length = process.argv.length;
    for (let i = 2; i < length; ++i) {
      const element = process.argv[i];
      if (element[0] === "-" || element[0] === "/"
        || endsWithSupportedExtension(element)) continue;

      const startOfExt = element.lastIndexOf(".");
      if (startOfExt === -1 || startOfExt === 0) continue;

      const noExt = element.substring(0, startOfExt);
      extLessFiles[noExt] = extLessFiles[noExt] + 1 || 1;
    }
  }

  const newArgumentsLength = newArguments.length;
  let isStdout, loopExists, fileExists,
      indexOfSetFile = 0,
      lastAutomaticFile,
      groupSeparator;

  global.fs ??= await import("node:fs");
  const { existsSync } = fs;
  for (let i = 0; i < newArgumentsLength; ++i) {
    let {
        [i]: arg,
      [i+1]: nextArg
    } = newArguments;
    const isParam = manageParam(arg);
    if (isParam) { arg = isParam; lastParam = "param"; }

    switch (arg) {
      case "-": {
        if (Options.getValue("fileOutputs")) stdoutFileModeConflictError()
        Options.addBooleanValue("toStdout", true)
        log(INFO_LVL, "Set stdout mode")
        break;
      }
      case !lastParam && arg: {
        let supportedExtension = true;
        const extension = arg.substring(arg.lastIndexOf(".") + 1);
        switch (extension) {
          case "wav":  case "wave":
          case "flac": case "mp3": case "opus": {
            const index = (
              extension === "wave"
                ? "WAV_INDEX"
                : extension.toUpperCase() + "_INDEX"
            );
            setFileOutputs(
              extension, FO_CONSTANTS[index], arg
            )
            break;
          }
          case "pcm": case "s16le": case "f32le":
            setFileOutputs(
              extension, FO_CONSTANTS["RAW_INDEX"], arg
            )
            break;

          default: supportedExtension = false;
        }
        if (!supportedExtension
            && existsSync(arg) || (fileExists = false)) {
          runSetFile(arg)

          if (
            !nextArg ||
            nextArg    === "|" ||
            nextArg[0] === "-" || // Parameters
            nextArg[0] === "/" ||
            endsWithSupportedExtension(nextArg) // File output
          ) break;
          if (!existsSync(nextArg)) { i++; break; }

          runSetFile(nextArg); i++
        }
        break;
      }
      case "|": { groupSeparator = true; break; }
      case "ask": case "confirm":
      case "a":   case "c": {
        Options.addBooleanValue("confirmation", true)
        log(INFO_LVL, "Set confirmation flag")
        break;
      }
      case "no-table": case "nt": {
        Options.addBooleanValue("noTable", true)
        log(INFO_LVL, "Set no-table flag")
        break;
      }
      case "no-progress": case "np": {
        Options.addBooleanValue("noProgress", true)
        log(INFO_LVL, "Set no-progress flag")
        break;
      }
      case "daemon": case "D": {
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        if (!isStdout) {
          Options.addBooleanValue("daemon")
          log(INFO_LVL, "Set daemon mode")
          break;
        }
        log(WARNING_LVL,
          "Ignoring daemon flag since stdout mode is enabled"
        )
        break;
      }
      case "dry-run": case "test": case "null":
      case "dr":      case "t":    case "0": {
        Options.addStringValue("dryRun")
        log(INFO_LVL, "Set dry-run mode")
        break;
      }
      case "max-threads": case "threads":
      case "mt":          case "T": {
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
      case "show-usage": case "U": {
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        if (!isStdout) {
          Options.addBooleanValue("showUsage", true)
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
      case "format": case "f": {
        setFormat(nextArg); i++
        break;
      }
      case "progress-delay": case "d": {
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
      case "input": case "i": {
        if (
          !nextArg ||
          nextArg    === "|" ||
          nextArg[0] === "-" || // Parameters
          nextArg[0] === "/" ||
          endsWithSupportedExtension(nextArg) // File output
        ) {
          console.error(
            formatStrings.errorText,
            "Missing a necessary argument"
          )
          process.exit(1)
        }
        lastParam = "input";
        if (!existsSync(nextArg)) { i++; break; }

        runSetFile(nextArg); i++
        break;
      }
      case "volume": case "vol": {
        setVolumeParameter(
          "volume", nextArg, lastIndex,
          Options.addIndexedNumberValue
            .bind(Options, "volume")
        )
        i++; break;
      }
      case "sample-rate": case "r": {
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        setSampleRate(nextArg, lastIndex, isStdout)
        i++
        break;
      }
      case "reverb-volume": case "rvb": {
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        const isExternal = Options.externalEffectProcesser(
          Number(lastIndex), isStdout
        );
        if (isExternal === true) {
          log(WARNING_LVL,
            "Ignored reverb-volume flag at index " +
             lastIndex + " since effects flag has been used"
          )
          i++; break;
        }
        setVolumeParameter(
          "reverb-volume", nextArg, lastIndex,
          Options.reverbVolume
        )
        i++; break;
      }
      case "effects": case "e": {
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        const isExternal = Options.externalEffectProcesser(
          Number(lastIndex), isStdout
        );
        if (isExternal === false) {
          log(WARNING_LVL,
            "Ignored effects flag at index " + lastIndex
            + " since a builtin effect option has been used " +
              "(e.g. reverb-volume)"
          )
          i++; break;
        }
        setEffects(nextArg, lastIndex, newArgumentsSet)
        i++
        break;
      }
      case "no-smooth-end": case "hard-stop":
      case "nose":          case "hs": {
        const number = Number(lastIndex);
        isStdout ??= testFunctions.stdout(newArgumentsSet);
        const isExternal = Options.externalEffectProcesser(number, isStdout);
        if (isExternal === false) {
          log(WARNING_LVL,
            "Ignored no-smooth-end flag at index "
            + lastIndex +
            " since a builtin effect option has been used " +
              "(e.g. reverb-volume)"
          )
          break;
        }
        Options.addIndexedBooleanValue("hardStop", number)
        log(INFO_LVL,
          "Set no-smooth-end flag at index " + lastIndex
        )
        break;
      }
      case "loop": case "l": {
        setLoopParameterValue(
          "loop", nextArg, lastIndex,
          Options.addIndexedNumberValue
            .bind(Options, "loopAmount")
        )
        i++; break;
      }
      case "loop-start": case "ls": {
        setLoopParameter(
          "loop-start", nextArg,
          setLoopParameterTimeValue, true,
          Options.addIndexedNumberValue
            .bind(Options, "loopStart")
        )
        i++; break;
      }
      case "loop-end": case "le": {
        setLoopParameter(
          "loop-end", nextArg,
          setLoopParameterTimeValue, true,
          Options.addIndexedNumberValue
            .bind(Options, "loopEnd")
        )
        i++; break;
      }
      case "loop-fade": case "lF": {
        loopExists ??= testFunctions.loop(newArgumentsSet);
        if (!loopExists) {
          log(WARNING_LVL,
            "Skipping loop-fade because loop isn't set"
          )
          break;
        }
        Options.addBooleanValue("loopFade", true)
        log(INFO_LVL, "Set loop-fade flag")
        break;
      }
      case "loop-fade-start": case "lFs": {
        setLoopParameter(
          "loop-fade-start", nextArg,
          setLoopParameterValue, true,
          Options.addIndexedNumberValue
            .bind(Options, "loopFadeStart")
        )
        i++; break;
      }
      case "loop-fade-duration": case "lFd": {
        setLoopParameter(
          "loop-fade-duration", nextArg,
          setLoopParameterValue, true,
          Options.addIndexedNumberValue
            .bind(Options, "loopFadeDuration")
        )
        i++; break;
      }
      case "loop-fade-interpolation": case "lFi": {
        setLoopParameter(
          "loop-fade-interpolation", nextArg,
          setLoopFadeInterpolation
        )
        i++; break;
      }
      // Skip verboseLevel, logFilePath
      // and spessasynthLogging flags
      case "verbose": case "v": {
        const nextArgument = Number(nextArg);
        // If it also has been provided a valid argument
        if (!Number.isNaN(nextArgument)) i++
        break;
      }
      case "log-file": case "lf":
      case (
        arg.startsWith("log-file") || arg.startsWith("lf")
      ) && arg: break;
      case "enable-spessasynth-logging":
      case "enable-spessasynth-warn-logging":
      case "enable-spessasynth-info-logging": break;

      default: {
        if (!isVerboseLevelSet) {
          loadingAnimation?.kill()
          process.stderr.write("\x1b[K")
        }
        const fileDetection = fileExists === false && arg[0] !== "-";
        let errorText = (
          fileDetection
            ? yellow+`'${underline+normalYellow + arg + normal+yellow}'`
            : red+`'${ underline+dimRed + arg + normal+red }'`
        );
        if (fileDetection) {
          errorText += ` doesn't exist${normal}`;
          console.error(errorText)
        } else {
          errorText += ` is an invalid parameter${normal}\n`
          await help({ errorText })
        }
        process.exit()
      }
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
  if (!Options.areGroupsValid()) {
    console.error(
      formatStrings.errorText, "Some groups are invalid"
    )
    process.exit(1)
  }
  return [loadingAnimation, loadingAnimationCleanupFunc];
}

/**
 * Checks for the same basename as the path given inside process.argv
 * @param {String}                 path         full file path to compare with another one
 * @param {Object<String, Number>} extLessFiles list of duplicated files without extensions
 * @inner
 * @private
 * @memberof module:cli
 * @return {Boolean} - whether or not it has found a similar file inside process.argv
 */
const checkForIdenticalName = (path, extLessFiles) => {
  const startOfExt = path.lastIndexOf(".");
  return extLessFiles[
    startOfExt === -1 ? path : path.substring(0, startOfExt)
  ] > 1;
}
/**
 * Returns either a new Promise or attaches a .then Promise to an older one
 * @param {Number}   indexOfSetFile index of the current setFile instance
 * @param {Function} func           function to run within a Promise
 * @inner
 * @private
 * @memberof module:cli
 * @return {(Promise|undefined)} - a new Promise that'll fulfill when the given function returns
 */
const createSetFilePromise = (indexOfSetFile, func) => {
  const lastSetFilePromise = setFilePromises[indexOfSetFile-1];
  return lastSetFilePromise?.then(func) ?? func();
}
/**
 * Generates a generic log message used inside setFile
 * @param {Boolean} type    file type
 * @param {String}  msgArg  filename
 * @param {Number}  [index] group index of the file
 * @inner
 * @private
 * @memberof module:cli
 * @return {String} generic log message
 */
const getSetFileMessage = (type, msgArg, index) => {
  const typeOfFile = type ? "midi" : "soundfont";
  return `Set ${typeOfFile} file to "${msgArg}" at index ${index}`;
}
/**
 * Sets a supported file inside a group in Options class
 * @param {module:typeDefinitions~setFileObjectParameters} setFileObjectParameters
 * @return {Promise<Promise|undefined>}
 */
const setFile = async ({
  indexOfSetFile, extLessFiles,
  lastParam, lastIndex,
  groupSeparator,
  lastAutomaticFile, arg
}) => {
  // Prevents any parameter getting here and
  // doing any undefined behaviour
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

  const inputIndex = Number(lastIndex ?? 0);
  // Manual addition
  if (lastIndex || lastParam) {
    return createSetFilePromise(indexOfSetFile, async () => {
      let needsToBeReplaced, setOfFiles;
      const files = Options.all.files;

      // Replaces the last soundfont it can reach if it needs to
      if (!typeOfFile && files) {
        setOfFiles = files[inputIndex];
        const fileMagicNumber = (
          setOfFiles instanceof Set
            ? await get20BytesFromFile(setOfFiles.getIndex(0))
            : ""
        );
        if (fileMagicNumber.length) needsToBeReplaced = (
          fileMagicNumber.includes("sfbk")
          || fileMagicNumber.includes("DLS")
        );
      }
      Options.files(inputIndex, arg, !typeOfFile, needsToBeReplaced)
      log(INFO_LVL,
        needsToBeReplaced
          ? `Replaced soundfont file from "${
              setOfFiles.getIndex(0)
            }" to "${arg}" at index ${inputIndex}`
          : getSetFileMessage(typeOfFile, arg, inputIndex)
      )
    });
  }

  // --- Automatic addition of files section ---
  return createSetFilePromise(indexOfSetFile, () => {
    /*
      This is how the algorithm for the automatic grouping works
      Twin file/group = same basename files of different types (.mid|.sf2)
                      arg
                       ↓
          has an added/existing twin file?
            ↓                          ↓
           yes                         no
           ↓                            ↓
      add it to its group        check in the list
                                        ↓
                                    found it?
                                  ↓           ↓
                                 yes          no
                               ↓                 ↓
                    create a new group    check lastAutomaticFile
                      and add it to it              |
                                                    ↓
                                                it exists?
                                              ↓            ↓
                                             yes           no
                                            ↓               |
                            found it in added files?        |
                             ↓                   ↓          |=--|
                            yes                 no              |
                             ↓                   |              ↓
                   is it in a twin group?        |=–––→ check if it's a twin group
                     ↓                ↓                   ↓                     ↓
                    yes               no                it is                it's not
                     |                 |                  |                     ↓
                     |                 |                  |             add it to the last
            |-------=|=----------------|-----------------=|             available Set
            |                          |
            ↓                          |=---------=|
    exists a normal group?                         ↓
      |                |                group separator exists?
      ↓                ↓               ↓                       ↓
     yes              no -=|          yes                      no
      |                    |           |                       ↓
      |                    |           |                    add it to
      |                    |=---------=|=--------=|         the last group
   is arg a soundfont?                            |
    ↓            ↓                                |
   yes           no ------------=|                |
     ↓                           ↓                ↓
   Does the group            add to that      add a new group
   already have one? → no →  group            and add to it
       ↓                                             ↑
      yes ------------------------------------------=|

    */
    const startOfExt = arg.lastIndexOf(".");
    const foundIndex = Options.searchAddedFile(
      startOfExt === -1
        ? arg : arg.substring(0, startOfExt),
      typeOfFile
    );
    if (typeof foundIndex === "number") {
      Options.files(foundIndex, arg, !typeOfFile)
      log(INFO_LVL, getSetFileMessage(typeOfFile, arg, foundIndex))
      return;
    }
    if (checkForIdenticalName(arg, extLessFiles)) {
      const amountOfGroups = Options.amountOfGroups;
      Options.files(amountOfGroups, arg, !typeOfFile)
      log(INFO_LVL,
        getSetFileMessage(typeOfFile, arg, amountOfGroups)
      )
      return;
    }
    let autoGroupChecked,
        lastKnownGroupIndex = Options.lastKnownGroupIndex ?? 0;
    if (lastAutomaticFile) automaticFileCheck: {
      const startOfExt = lastAutomaticFile.lastIndexOf(".");
      let indexOfGroup = Options.searchAddedFile(
        startOfExt === -1
          ? lastAutomaticFile
          : lastAutomaticFile.substring(0, startOfExt)
      );
      if (typeof indexOfGroup !== "number") break automaticFileCheck;

      if (Options.isAutomaticBasenameGroup(
        extLessFiles, indexOfGroup
      )) {
        autoGroupChecked = null;
        lastKnownGroupIndex = (
          Options.lastRegularGroupIndex !== undefined
            ? Options.lastRegularGroupIndex
            : lastKnownGroupIndex + 1
        );
        break automaticFileCheck;
      }
      lastKnownGroupIndex = groupSeparator ? ++indexOfGroup : indexOfGroup;
    }
    if (
      autoGroupChecked === undefined &&
      Options.isAutomaticBasenameGroup(
        extLessFiles, lastKnownGroupIndex
      )
    ) {
      lastKnownGroupIndex = (
        Options.lastRegularGroupIndex !== undefined
          ? Options.lastRegularGroupIndex
          : lastKnownGroupIndex + 1
      );
    }
    Options.lastRegularGroupIndex = (
      !typeOfFile && Options.isLastRegularGroupOccupied()
        ? ++lastKnownGroupIndex : lastKnownGroupIndex
    );
    Options.files(lastKnownGroupIndex, arg, !typeOfFile)
    log(INFO_LVL,
      getSetFileMessage(typeOfFile, arg, lastKnownGroupIndex)
    )
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
  lastIndexNumber: Number(lastIndex),
  lastIndexString: lastIndex ?? "0"
});
const maybeTruncate = string => (
  string?.length > 20
    ? string.substring(0, 20) + "..."
    : string ?? "no argument"
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
    log(INFO_LVL, `Set ${name} to 1 at ${lastIndex} index`)
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
    log(INFO_LVL, `Set ${name} to ${number} at ${lastIndex} index`)
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
  Options.addIndexedStringValue(
    "loopFadeInterpolation", lastIndexNumber, type
  )
  log(INFO_LVL, `Set loop-fade-interpolation to ${arg} at ${lastIndex} index`)
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
    log(INFO_LVL, `Set ${name} to ${seconds} at ${lastIndex} index`)
    return;
  }
  if (isRealNumber(number, true) && !(number < 0)) {
    func.call(Options, lastIndexNumber, number)
    log(INFO_LVL, `Set ${name} to ${number} at ${lastIndex} index`)
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
 * @param {Boolean} isStdout - if it's stdout mode
 */
const setSampleRate = (arg, lastIndex, isStdout) => {
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
    if (isStdout) {
      Options.addNumberValue("sampleRate", number)
      log(INFO_LVL, `Set sample-rate for all to ${number} because output is stdout`)
      return;
    }
    Options.addIndexedNumberValue(
      "sampleRate", lastIndexNumber, number
    )
    log(INFO_LVL, `Set sample-rate to ${number} at ${lastIndex} index`)
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
    Options.addNumberValue("verboseLevel", number)
    log(INFO_LVL,
      isFromUser
        ? `Set verbose level to ${number}`
        : "Set default verbose level"
    )
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
      Options.addStringValue("format", "wave")
      log(INFO_LVL, "Set stdout format to 'wave'")
      return;
    }
    case "flac":
    case "opus":
    case "mp3": {
      Options.addStringValue("format", arg)
      log(INFO_LVL, `Set stdout format to '${arg}'`)
      return;
    }
    case "s16le": case "f32le":
    case "pcm": {
      const formatToUse = (arg === "f32le") ? "f32le" : "pcm";
      Options.addStringValue("format", formatToUse)
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
      Options.effects(Number(lastIndex), list)
    }
    log(INFO_LVL, "Set list of SoX effects as", JSON.stringify(list))
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
    log(INFO_LVL, `Set ${name} to ${dBNumber} at ${lastIndex} index`)
    return;
  }
  if (regexes.isPercentage.test(arg)) {
    const percentage = Number(arg.match(regexes.percentageNumber)[1]);
    const toFloat = percentage / 100;

    func.call(Options, lastIndexNumber, toFloat)
    log(INFO_LVL, `Set ${name} to ${toFloat} at ${lastIndex} index`)
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
    log(INFO_LVL, `Set ${name} to ${number} at ${lastIndex} index`)
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
    Options.addNumberValue("maxThreads", number)
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
    Options.addNumberValue("progressDelay", 500)
    log(INFO_LVL, `Set progress-delay to 500`)
    return;
  }
  if (isRealNumber(number, true) && number >= 50) {
    Options.addNumberValue("progressDelay", number)
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
  Options.addStringValue("logFilePath", pathToUse)
  log(INFO_LVL, `Set log-file path to ${pathToUse}`)
}
/**
 * Runs uninstall.mjs and uninstall spessoplayer
 */
const uninstall = async () => {
  const { execSync } = await import("node:child_process");
  const uninstallScriptPath = `${import.meta.dirname}${sep}uninstall.mjs`;
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
    for (let i = 0; i < lengthOfLines; ++i) {
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
    for (let i = 0; i < length; ++i) {
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
      -i:2 song.mid -i:2 song2.mid -i:2 soundfontfile.sf2`
    )}

  Parameter Indexes:
    Each parameter can take an optional index
    that points to each song's index (${optional(":n")})

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
      ["--input"+optional(":n")+" "+grayBoldText("file"),
       "/input"+optional(":n")+" "+grayBoldText("file")],
      ["-i"+optional(":n")+" "+grayBoldText("file"),
       "/i"+optional(":n")+" "+grayBoldText("file")]
    )}:
      ${multiLine("Takes the following file and puts it in the list by n")}

    ${param(
      ["--volume"+optional(":n")+" "+grayBoldText("amount"),
       "/volume"+optional(":n")+" "+grayBoldText("amount")],
      ["-vol"+optional(":n")+" "+grayBoldText("amount"),
       "/vol"+optional(":n")+" "+grayBoldText("amount")]
    )}:
      ${multiLine(
      `Volume to set (default: 100%)

      Available formats:
        - dB (example -10dB)
        - percentages (example 70%)
        - decimals (example 0.9)`
      )}

    ${param(
      ["--reverb-volume"+optional(":n")+" "+grayBoldText("amount"),
       "/reverb-volume"+optional(":n")+" "+grayBoldText("amount")],
      ["-rvb"+optional(":n")+" "+grayBoldText("amount"),
       "/rvb"+optional(":n")+" "+grayBoldText("amount")]
    )}:
      ${multiLine(
      `Volume to set for reverb
      Same formats as volume but with different results
      because it's a builtin effect
        (confilcts with --effects) (default: none)`
      )}

    ${param(
      ["--effects"+optional(":n")+" "+grayBoldText("effects_list"),
       "/effects"+optional(":n")+" "+grayBoldText("effects_list")],
      ["-e"+optional(":n")+" "+grayBoldText("effects_list"),
       "/e"+optional(":n")+" "+grayBoldText("effects_list")]
    )}:
      ${multiLine('Adds any effects that SoX provides (e.g "reverb,fade 1")')}

    ${param(
      ["--no-smooth-end"+optional(":n"),
       "/no-smooth-end"+optional(":n"),
       "--hard-stop"+optional(":n"),
       "/hard-stop"+optional(":n")],
      ["-nose"+optional(":n"), "/nose"+optional(":n"),
       "/hs"+optional(":n"),   "/hs"+optional(":n")]
    )}:
      ${multiLine(`Disables the gradual/smooth effect
      that is added at the end of the song
      (confilcts with a builtin effect such as reverb-volume)`)}

    ${param(
      ["--loop"+optional(":n")+" "+grayBoldText("seconds"),
        "/loop"+optional(":n")+" "+grayBoldText("seconds")],
      ["-l"+optional(":n")+" "+grayBoldText("seconds"),
       "/l"+optional(":n")+" "+grayBoldText("seconds")]
    )}:
      ${multiLine(
      `Loop x amount of times (default: 0)
        (It might be slow with bigger numbers)`
      )}

    ${param(
      ["--loop-start"+optional(":n")+" "+grayBoldText("seconds"),
        "/loop-start"+optional(":n")+" "+grayBoldText("seconds")],
      ["-ls"+optional(":n")+" "+grayBoldText("seconds"),
       "/ls"+optional(":n")+" "+grayBoldText("seconds")]
    )}:
      ${multiLine(`The loop will start after ${grayBoldText("seconds")}`)}

    ${param(
      ["--loop-end"+optional(":n")+" "+grayBoldText("seconds"),
       "/loop-end"+optional(":n")+" "+grayBoldText("seconds")],
      ["-le"+optional(":n")+" "+grayBoldText("seconds"),
       "/le"+optional(":n")+" "+grayBoldText("seconds")]
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
      ["--loop-fade-start"+optional(":n")+" "+grayBoldText("seconds"),
       "/loop-fade-start"+optional(":n")+" "+grayBoldText("seconds")],
      ["-lFs"+optional(":n")+" "+grayBoldText("seconds"),
       "/lFs"+optional(":n")+" "+grayBoldText("seconds")]
    )}:
      ${multiLine(
      "When the loop fade starts (default: 1)"
      )}

    ${param(
      ["--loop-fade-duration"+optional(":n")+" "+grayBoldText("seconds"),
       "/loop-fade-duration"+optional(":n")+" "+grayBoldText("seconds")],
      ["-lFd"+optional(":n")+" "+grayBoldText("seconds"),
       "/lFd"+optional(":n")+" "+grayBoldText("seconds")]
    )}:
      ${multiLine(
      "How much the loop fade should last (default: 4)"
      )}

    ${param(
      ["--loop-fade-interpolation"+optional(":n")+" "+grayBoldText("type"),
       "/loop-fade-interpolation"+optional(":n")+" "+grayBoldText("type")],
      ["-lFi"+optional(":n")+" "+grayBoldText("type"),
       "/lFi"+optional(":n")+" "+grayBoldText("type")]
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
      ["--sample-rate"+optional(":n")+" "+grayBoldText("samples"),
       "/sample-rate"+optional(":n")+" "+grayBoldText("samples")],
      ["-r"+optional(":n")+" "+grayBoldText("samples"),
       "/r"+optional(":n")+" "+grayBoldText("samples")]
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
        - opus
        - flac
        - pcm (f32le)`
      )}

    ${param(
      [
        "--max-threads "+grayBoldText(":n"),
        "/max-threads "+grayBoldText(":n"),
        "--threads "+grayBoldText(":n"),
        "/threads "+grayBoldText(":n")
      ],
      [
        "-mt "+grayBoldText(":n"),
        "/mt "+grayBoldText(":n"),
        "-T "+grayBoldText(":n"),
        "/T "+grayBoldText(":n")
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

    ${param(["--daemon", "/daemon"], ["-D", "/D"])}:
      ${multiLine("Enables daemon mode (also known as a server)")}

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
  const packageJSONPath = `${import.meta.dirname}${sep}package.json`;
  const { version: versionNumber } = JSON.parse(fs.readFileSync(packageJSONPath).toString());

  log(INFO_LVL, `Taken version number from ${packageJSONPath}`)
  //             ↓ Cleans up potential loading text
  console.log(`\x1b[K${green + versionNumber + normal}`)
}

export {
  manageVerboseOptions,
  actUpOnPassedArgs,
  Options
}

