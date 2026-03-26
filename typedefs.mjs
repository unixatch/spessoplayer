/**
 * @module typeDefinitions
 */

/*
  ——— PARAMETERS OBJECTS ———
*/
/**
 * @typedef formatObjectParameters
 * @type {Object}
 * @property {(String|Boolean)} [formatObj.format=true]             type of format
 * @property {Readable}         formatObj.readStream                ReadStream for piping
 * @property {ResponseServer}   [formatObj.res]                     optional ResponseServer
 * @property {Object[]}         [formatObj.effects]                 list of effects to apply
 * @property {Number}           formatObj.index                     index of the song
 * @property {Boolean}          [formatObj.createNewFileNameAnyway] if it's necessary to create a new file name
 * @property {String[]}         [formatObj.fileOutputs]             list of file outputs
 * @property {Uint8Array}       [formatObj.stdoutHeader]            header of the file
 * @property {Promise[]}        formatObj.promisesOfPrograms        list of promises for ffmpeg and SoX
 * @property {String}           [formatObj.outFile]                 file name to output
 */
/**
 * @typedef sampleCountObjectParameters
 * @type {Object}
 * @property {BasicMIDI} sampleCountObj.midi               The BasicMIDI class to use
 * @property {Number}    [sampleCountObj.sampleRate=48000] The sample rate to use
 * @property {Number}    [sampleCountObj.loopAmount]       The amount of loops to do
 * @property {Number}    [sampleCountObj.loopStart=midi.midiTicksToSeconds(midi.loop.start)] start of loop
 * @property {Number}    [sampleCountObj.loopEnd]          end of loop
 */
/**
 * @typedef initObjectParameters
 * @type {Object}
 * @property {Number}  [initObjParams.loopAmount=0]          the loop amount
 * @property {Number}  [initObjParams.volume=100/100]        the volume to set
 * @property {String}  initObjParams.midiFile                midi file
 * @property {String}  initObjParams.soundfontFile           soundfont file
 * @property {Number}  [initObjParams.sampleRate=48000]      sample rate
 * @property {Number}  initObjParams.loopStart               start of loop
 * @property {Number}  initObjParams.loopEnd                 end of loop
 * @property {Number}  initObjParams.indexOfGroup            index of the Set/group the song is in
 * @property {Boolean} [initObjParams.onlySampleCount=false] if it should return just the sample count of the song and do nothing else
 */
/**
 * @typedef effectsObjectParams
 * @type {Object}
 * @param {String}              obj.program                 the process to spawn, sox usually
 * @param {Stream}              obj.stdoutHeader            the header to process
 * @param {Stream}              [obj.readStream]            the data to process
 * @param {Promise[]}           obj.promisesOfPrograms      list of promises for ffmpeg and SoX
 * @param {Stream}              [obj.stdout=process.stdout] the destination
 * @param {String}              [obj.destination="-"]       the destination path
 * @param {(String[]|Object[])} [obj.effects=String[]]      all effects to pass to SoX
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
 * @property  {Number}   [sampleRate=48000] sample rate
 * @property  {Number}   [volume=100/100]   the volume of the song
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
 * @property {Number}               sampleCount       sample count
 * @property {Number}               sampleRate        sample rate
 * @property {Number}               [index]           index of the song
 * @property {Number}               [durationRounded] duration of the song rounded by percentage
 * @property {SpessaSynthSequencer} seq               spessasynth_core' sequencer
 * @property {SpessaSynthProcessor} synth             spessasynth_core's processor
 * @property {Function}             getData           translator: Float32Arrays → Uint8Arrays
 * @property {Number}               amountOfSongs     total of songs
 * @property {MessagePort}          parentPort        port of the main thread
 * @property {Object}               progressBuffers   Object that contains SharedArrayBuffers
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
