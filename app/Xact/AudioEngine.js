const Log = require('../Log');
const BufferReader = require('../BufferReader');
const XnbError = require('../XnbError');

// Audio Engine Constants
const XGSF_FORMAT = 0x2A;

/**
 * AudioEngine class is used to load XACT XGS files
 * @public
 * @class
 */
class AudioEngine {
    constructor() {

    }

    /**
     * Load the specified file.
     * @public
     * @param {String} filename
     */
    load(filename) {
        // create a buffer and load the file
        try {
            // create a new buffer to work with
            const buffer = new BufferReader(filename);
            // process the file
            this.proccess(buffer);
        }
        catch (ex) {
            Log.error(`Exception caught while loading ${filename} into AudioEngine`);
            Log.error(ex.stack);
        }
    }

    /**
     * Processes the file.
     * @private
     * @param {BufferReader} buffer
     */
    proccess(buffer) {
        // read in the magic
        const magic = buffer.read(4);
        // ensure the magic matches
        if (magic != 'XGSF')
            throw new XnbError(`Invalid magic found, ${magic}`);

        // read in tool and format versions
        const toolVersion = buffer.read(2).readUInt16LE();
        const formatVersion = buffer.read(2).readUInt16LE();

        // see if we have a known format
        if (formatVersion != XGSF_FORMAT)
            Log.warn(`XGS format not supported!`);

        // log the versions
        Log.debug(`Tool Version: ${toolVersion}`);
        Log.debug(`Format Version: ${formatVersion}`);

        // get the useless CRC that we don't care about
        const crc = buffer.read(2).readUInt16LE();

        // get the last modified low and high values
        const lastModifiedLow = buffer.read(4).readUInt32LE();
        const lastModifiedHigh = buffer.read(4).readUInt32LE();

        // skip unknown byte (possibly platform)
        buffer.seek(1);

        // read the number of categories and variables
        const numCats = buffer.read(2).readUInt16LE();
        const numVars = buffer.read(2).readUInt16LE();

        Log.debug(`Categories: ${numCats}`);
        Log.debug(`Variables: ${numVars}`);

        // skip past two unknown 16-bit integers
        buffer.seek(4);

        // read number of RPC, DSP presets and params
        const numRpc = buffer.read(2).readUInt16LE();
        const numDspPresets = buffer.read(2).readUInt16LE();
        const numDspParams = buffer.read(2).readUInt16LE();

        Log.debug(`RPC: ${numRpc}`);
        Log.debug(`DSP Presets: ${numDspPresets}`);
        Log.debug(`DSP Params: ${numDspParams}`);

        // get the offset for the categories and variables
        const catsOffset = buffer.read(4).readUInt32LE();
        const varsOffset = buffer.read(4).readUInt32LE();

        Log.debug(`Category Offset: ${catsOffset}`);
        Log.debug(`Variables Offset: ${varsOffset}`);

        // unknown 32-bit uint
        buffer.seek(4);
        // get category name index offset
        const catNameIndexOffset = buffer.read(4).readUInt32LE();
        // unknown 32-bit uint
        buffer.seek(4);
        // get variable name index offset
        const varNameIndexOffset = buffer.read(4).readUInt32LE();

        Log.debug(`Category Name Index Offset: ${catNameIndexOffset}`);
        Log.debug(`Variable Name Index Offset: ${varNameIndexOffset}`);

        // read in the category and variable names offsets
        const catNamesOffset = buffer.read(4).readUInt32LE();
        const varNamesOffset = buffer.read(4).readUInt32LE();

        // read in RPC, DSP preset and params offsets
        const rpcOffset = buffer.read(4).readUInt32LE();
        const dspPresetOffset = buffer.read(4).readUInt32LE();
        const dspParamsOffset = buffer.read(4).readUInt32LE();

        Log.debug(`Category Names Offset: ${catNamesOffset}`);
        Log.debug(`Variables Names Offset: ${varNamesOffset}`);
        Log.debug(`RPC Offset: ${rpcOffset}`);
        Log.debug(`DSP Preset Offset: ${dspPresetOffset}`);
        Log.debug(`DSP Params Offset: ${dspParamsOffset}`);

        // seek to the category name offset to read in the categories
        buffer.seek(catNamesOffset, 0);
        const categoryNames = this._readNullTerminatedStrings(buffer, numCats);
        Log.debug(`Categories: ${categoryNames}`);

        // get the actual category data
        const categories = new Array(numCats);
        // seek to the category offset
        buffer.seek(catsOffset, 0);
        // loop over categories
        for (let i = 0; i < numCats; i++) {
            //categories[i] = new AudioCategory()
            //categoryLookup.push(categoryNames[i])
        }
    }

    /**
     * Reads null terminated strings from buffer.
     * @private
     * @param {BufferReader} buffer
     * @param {Number} count
     * @returns {String[]}
     */
    _readNullTerminatedStrings(buffer, count) {
        Log.debug(`Reading ${count} strings`);
        const ret = new Array(count);
        for (let i = 0; i < count; i++) {
            const s = [];
            while (buffer.peek(1).readUInt8() != 0x0)
                s.push(buffer.read(1));
            buffer.seek(1);
            ret[i] = s.join('').trim();
        }
        return ret;
    }
}

module.exports = AudioEngine;
