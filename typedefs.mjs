/**
 * @module typeDefinitions
 */

/*
  ——— PARAMETERS OBJECTS ———
*/
  //-| mainFunctions.mjs |-//
/**
 * @typedef formatObjectParameters
 * @type {Object}
 * @property {(String|Boolean)} [format=true]             type of format
 * @property {Readable}         readStream                ReadStream for piping
 * @property {ResponseServer}   [res]                     optional ResponseServer
 * @property {Object[]}         [effects]                 list of effects to apply
 * @property {Number}           index                     index of the song
 * @property {Boolean}          [createNewFileNameAnyway] if it's necessary to create a new file name
 * @property {String[]}         [fileOutputs]             list of file outputs
 * @property {Uint8Array}       [stdoutHeader]            header of the file
 * @property {Promise[]}        promisesOfPrograms        list of promises for ffmpeg and SoX
 * @property {String}           [outFile]                 file name to output
 */
/**
 * @typedef sampleCountObjectParameters
 * @type {Object}
 * @property {BasicMIDI} midi               The BasicMIDI class to use
 * @property {Number}    [sampleRate=48000] The sample rate to use
 * @property {Number}    [loopAmount]       The amount of loops to do
 * @property {Number}    [loopStart=midi.midiTicksToSeconds(midi.loop.start)] start of loop
 * @property {Number}    [loopEnd]          end of loop
 */
/**
 * @typedef initObjectParameters
 * @type {Object}
 * @property {Number}  [loopAmount=0]          the loop amount
 * @property {Number}  [volume=100/100]        the volume to set
 * @property {String}  midiFile                midi file
 * @property {String}  soundfontFile           soundfont file
 * @property {Number}  [sampleRate=48000]      sample rate
 * @property {Number}  loopStart               start of loop
 * @property {Number}  loopEnd                 end of loop
 * @property {Number}  indexOfGroup            index of the Set/group the song is in
 * @property {Boolean} [isToFile=false]        if it's the toFile function
 * @property {Boolean} [onlySampleCount=false] if it should return just the sample count of the song and do nothing else
 * @property {Boolean} [onlyDuration=false]    if it should return just the duration of the song and do nothing else
 */
/**
 * @typedef effectsObjectParams
 * @type {Object}
 * @param {String}              program                 the process to spawn, sox usually
 * @param {Stream}              stdoutHeader            the header to process
 * @param {Stream}              [readStream]            the data to process
 * @param {Promise[]}           promisesOfPrograms      list of promises for ffmpeg and SoX
 * @param {Stream}              [stdout=process.stdout] the destination
 * @param {String}              [destination="-"]       the destination path
 * @param {(String[]|Object[])} [effects=String[]]      all effects to pass to SoX
 */
  //-| cli.mjs |-//
/**
 * @typedef lastIndexGroupObject
 * @type {Object}
 * @property {String} [index] - last index that has been set last time
 */
/**
 * @typedef setFileObjectParameters
 * @type {Object}
 * @property {Number}               indexOfSetFile    index of the current function inside setFilePromises
 * @property {String}               lastParam         last parameter that has been used last time
 * @property {lastIndexGroupObject} lastIndex         last index object
 * @property {String}               lastAutomaticFile last file that has been set automatically
 * @property {String[]}             newArguments      arguments passed from the terminal
 * @property {String}               arg               argument passed to this function that is also a file path
 */
  //-| audioBuffer.mjs |-//
/**
 * @typedef getWavHeaderObjectParameters
 * @type {Object}
 * @property {Number} length      Audio length in samples, essentially the sample count
 * @property {Number} numChannels How many channels the audio has
 */

/*
  ——— OPTIONS OBJECTS ———
*/
/**
 * @typedef toStdoutOptionsObject
 * @type {Object}
 * @property  {Number}   [loopAmount]       the number of loops to do
 * @property  {Number}   [loopStart]        start of loop
 * @property  {Number}   [loopEnd]          end of loop
 * @property  {Number}   [sampleRate]       sample rate
 * @property  {Number}   [volume]           the volume of the song
 * @property  {String}   [format=""]        format of the song
 * @property  {String}   midiFile           midi file
 * @property  {String}   soundfontFile      soundfont file
 * @property  {Object[]} [effects]          effects for the song
 */
/**
 * @typedef toFileOptionsObject
 * @type {Object}
 * @extends toStdoutOptionsObject
 * @property {String[]} fileOutputs list of file output names
 */
/**
 * @typedef createReadableObjectParameters
 * @type {Object}
 * @property {Number}               sampleCount        sample count
 * @property {Number}               [sampleRate=48000] sample rate
 * @property {Number}               [index]            index of the song
 * @property {SpessaSynthSequencer} seq                spessasynth_core' sequencer
 * @property {SpessaSynthProcessor} synth              spessasynth_core's processor
 * @property {Function}             getData            translator: Float32Arrays → Uint8Arrays
 * @property {Number}               amountOfSongs      total of songs
 * @property {Object}               progressBuffers    Object that contains SharedArrayBuffers
 */

/*
  ——— RETURN VALUES ———
*/
/**
 * @typedef ffmpegArgsObj
 * @type {Object}
 * @property {String[]} flac
 * @property {String[]} mp3
 */
/**
 * @typedef getSampleCountObj
 * @type {Object}
 * @property {Boolean} loopDetectedInMidi
 * @property {Number}  durationInSeconds
 * @property {Number}  sampleCount
 */
/**
 * @typedef initSpessaSynthObj
 * @type {Object}
 * @property {SpessaSynthSequencer} seq
 * @property {SpessaSynthProcessor} synth
 * @property {BasicMIDI}            midi
 * @property {Number}               sampleCount
 * @property {Number}               durationInSeconds
 */
/**
 * @typedef toStdoutArray
 * @type {Array}
 * @property {Number}         sampleCount
 * @property {Function}       pipingFunction
 * @property {Promise<Array>} sampleCount
 */
/**
 * @typedef toFileArray
 * @type {Array}
 * @property {String[]}       fileOutputs
 * @property {pipingFunction} pipingFunction
 * @property {Promise<Array>} Promise
 */
