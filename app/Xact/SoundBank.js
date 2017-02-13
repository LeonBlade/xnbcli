const Log = require('../Log');
const BufferReader = require('../BufferReader');
const XnbError = require('../XnbError');
const Enum = require('../Enum');
const Struct = require('../Struct');

// SoundBank Constants
const SDBK_FORMAT_VERSION = 0x2B;

/**
 * SoundBank is used for XACT Sound Bank files.
 * @public
 * @class
 */
class SoundBank {
    /**
     * Load the specified file.
     * @public
     * @param {String} filename
     */
    static load(filename) {
        // create a buffer and load the file
        try {
            // create a new buffer to work with
            const buffer = new BufferReader(filename);
            // process the file
            this._proccess(buffer);
        }
        catch (ex) {
            Log.error(`Exception caught while loading ${filename} into AudioEngine`);
            Log.error(ex.stack);
        }
    }

    /**
     * Proccess the SoundBank
     * @private
     * @param {BufferReader} buffer
     */
    static _proccess(buffer) {
        const magic = buffer.read(4);
        if (magic != 'SDBK')
            throw new XnbError(`Invalid magic found, ${magic}`);

        const toolVersion = buffer.readUInt16();
        const formatVersion = buffer.readUInt16();

        if (formatVersion != SDBK_FORMAT_VERSION)
            Log.warn(`SoundBank format ${formatVersion} not supported.`);

        Log.debug(`Format Version: ${Log.h(formatVersion)}`);
        Log.debug(`Tool Version: ${Log.h(toolVersion)}`);

        // fcs16 checksum for following data
        // NOTE: giving zero fucks about CRC
        const crc = buffer.readUInt16();
        Log.debug(`CRC: ${Log.h(crc)}`);

        const lastModifiedLow = buffer.readUInt32();
        const lastModifiedHigh = buffer.readUInt32();
        const platform = buffer.readByte();

        Log.debug(`LML: ${lastModifiedLow}, LMH: ${lastModifiedHigh}`);
        Log.debug(`Platform: ${Log.h(platform)}`);

        const numSimpleCues = buffer.readUInt16();
        const numComplexCues = buffer.readUInt16();
        buffer.seek(2);
        const numTotalCues = buffer.readUInt16();
        const numWaveBanks = buffer.readByte();
        const numSounds = buffer.readUInt16();
        const cueNameTableLen = buffer.readUInt16();
        buffer.seek(2);

        Log.debug(`Simple Cues: ${numSimpleCues}`);
        Log.debug(`Complex: ${numComplexCues}`);
        Log.debug(`Total Cues: ${numTotalCues}`);
        Log.debug(`Wave Banks: ${numWaveBanks}`);
        Log.debug(`Sounds: ${numSounds}`);
        Log.debug(`Cue Name Table Length: ${cueNameTableLen}`);

        const simpleCuesOffset = buffer.readUInt32();
        const complexCuesOffset = buffer.readUInt32();
        const cueNamesOffset = buffer.readUInt32();
        buffer.seek(4);
        const variationTableOffset = buffer.readUInt32();
        buffer.seek(4);
        const waveBankNameTableOffset = buffer.readUInt32();
        const cueNameHashTableOffset = buffer.readUInt32();
        const cueNameHashValsOffset = buffer.readUInt32();
        const soundsOffset = buffer.readUInt32();

        Log.debug(`Simple Cues Offset: ${simpleCuesOffset}`);
        Log.debug(`Complex Cues Offset: ${complexCuesOffset}`);
        Log.debug(`Cue Names Offset: ${cueNamesOffset}`);
        Log.debug(`Variation Table Offset: ${variationTableOffset}`);
        Log.debug(`Wave Bank Name Table Offset: ${waveBankNameTableOffset}`);
        Log.debug(`Cue Name Hash Table Offset: ${cueNameHashTableOffset}`);
        Log.debug(`Cue Name Hash Values Offset: ${cueNameHashValsOffset}`);
        Log.debug(`Sounds Offset: ${soundsOffset}`);

        const name = buffer.read(64);
        Log.debug(`Name: ${name}`);

        // parse wave bank name table
        buffer.seek(waveBankNameTableOffset, 0);
        const waveBanks = new Array(numWaveBanks);
        const waveBankNames = new Array(numWaveBanks);
        for (let i = 0; i < numWaveBanks; i++)
            waveBankNames[i] = buffer.read(64);

        Log.debug(`Wave Banks: ${waveBankNames}`);

        // parse cue name table
        buffer.seek(cueNamesOffset, 0);
        const cueNames = buffer.read(cueNameTableLen).toString().split('\0').slice(0, -1);
        buffer.seek(simpleCuesOffset, 0);
        for (let i = 0; i < numSimpleCues; i++) {
            const flags = buffer.read(1);
            const soundOffset = buffer.readUInt32();
        }
        Log.debug(`Cues: ${cueNames}`);
    }
}

module.exports = SoundBank;
