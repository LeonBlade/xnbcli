const Log = require('../Log');
const BufferReader = require('../BufferReader');
const XnbError = require('../XnbError');
const Enum = require('../Enum');
const Struct = require('../Struct');

// Audio Engine Constants
const XGSF_FORMAT = 0x2A;

// Structs and Enums used for AudioEngine
const Variable = Struct({
    name: '',
    value: 0.0,

    isGlobal: false,
    isReadOnly: false,
    isPublic: false,
    isReserved: false,

    initValue: 0.0,
    maxValue: 0.0,
    minValue: 0.0
});

const RpcPointType = Enum([
    'Linear',
    'Fast',
    'Slow',
    'SinCos'
]);

const RpcPoint = Struct({
    x: 0.0,
    y: 0.0,
    type: undefined
});

const RpcParameter = Enum([
    'Volume',
    'Pitch',
    'ReverbSend',
    'FilterFrequency',
    'FilterQFactor'
]);

const RpcCurve = Struct({
    variable: 0,
    parameter: undefined,
    points: []
});

/**
 * AudioEngine class is used to load XACT XGS files
 * @public
 * @class
 */
class AudioEngine {
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
        const toolVersion = buffer.readUInt16();
        const formatVersion = buffer.readUInt16();

        // see if we have a known format
        if (formatVersion != XGSF_FORMAT)
            Log.warn(`XGS format not supported!`);

        // log the versions
        Log.debug(`Tool Version: ${toolVersion}`);
        Log.debug(`Format Version: ${formatVersion}`);

        // get the useless CRC that we don't care about
        const crc = buffer.readUInt16();

        // get the last modified low and high values
        const lastModifiedLow = buffer.readUInt32();
        const lastModifiedHigh = buffer.readUInt32();

        // skip unknown byte (possibly platform)
        buffer.seek(1);

        // read the number of categories and variables
        const numCats = buffer.readUInt16();
        const numVars = buffer.readUInt16();

        Log.debug(`Categories: ${numCats}`);
        Log.debug(`Variables: ${numVars}`);

        // skip past two unknown 16-bit integers
        buffer.seek(4);

        // read number of RPC, DSP presets and params
        const numRpc = buffer.readUInt16();
        const numDspPresets = buffer.readUInt16();
        const numDspParams = buffer.readUInt16();

        Log.debug(`RPC: ${numRpc}`);
        Log.debug(`DSP Presets: ${numDspPresets}`);
        Log.debug(`DSP Params: ${numDspParams}`);

        // get the offset for the categories and variables
        const catsOffset = buffer.readUInt32();
        const varsOffset = buffer.readUInt32();

        Log.debug(`Category Offset: ${catsOffset}`);
        Log.debug(`Variables Offset: ${varsOffset}`);

        // unknown 32-bit uint
        buffer.seek(4);
        // get category name index offset
        const catNameIndexOffset = buffer.readUInt32();
        // unknown 32-bit uint
        buffer.seek(4);
        // get variable name index offset
        const varNameIndexOffset = buffer.readUInt32();

        Log.debug(`Category Name Index Offset: ${catNameIndexOffset}`);
        Log.debug(`Variable Name Index Offset: ${varNameIndexOffset}`);

        // read in the category and variable names offsets
        const catNamesOffset = buffer.readUInt32();
        const varNamesOffset = buffer.readUInt32();

        // read in RPC, DSP preset and params offsets
        const rpcOffset = buffer.readUInt32();
        const dspPresetOffset = buffer.readUInt32();
        const dspParamsOffset = buffer.readUInt32();

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
        //const categories = new Array(numCats);

        // seek to the variable names offset
        buffer.seek(varNamesOffset, 0);
        // read in the variable names
        const varNames = this._readNullTerminatedStrings(buffer, numVars);
        Log.debug(`Variables: ${varNames}`);

        // read in the variables themselves
        const variables = new Array(numVars);
        // seek to the variable offset
        buffer.seek(varsOffset, 0);
        // loop over the variables
        for (let i = 0; i < numVars; i++) {
            // create the variable for this index
            variables[i] = new Variable({ name: varNames[i] });

            const flags = buffer.readByte();
            variables[i].isPublic = (flags & 0x1) != 0;
            variables[i].isReadOnly = (flags & 0x2) != 0;
            variables[i].isGlobal = (flags & 0x4) != 0;
            variables[i].isReserved = (flags & 0x8) != 0;

            variables[i].initValue = buffer.readSingle();
            variables[i].minValue = buffer.readSingle();
            variables[i].maxValue = buffer.readSingle();

            variables[i].value = variables[i].initValue;
        }

        Log.debug(JSON.stringify(variables, null, 4));

        // RPC curves
        const rpcCurves = new Array(numRpc);
        buffer.seek(rpcOffset, 0);
        for (let i = 0; i < numRpc; i++) {
            rpcCurves[i] = new RpcCurve({ variable: buffer.readUInt16() });
            const pointCount = buffer.readByte();
            rpcCurves[i].parameter = buffer.readUInt16();
            rpcCurves[i].points = new Array(pointCount);
            for (let j = 0; j < pointCount; j++) {
                rpcCurves[i].points[j] = new RpcPoint({
                    x: buffer.readSingle(),
                    y: buffer.readSingle(),
                    type: buffer.readByte(),
                });
            }
        }

        Log.debug(JSON.stringify(rpcCurves, null, 4));
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
        for (let i = 0; i < count; i++)
            ret[i] = buffer.readString();
        return ret;
    }
}

module.exports = AudioEngine;
