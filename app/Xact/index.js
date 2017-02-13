const path = require('path');
const Log = require('../Log');
const XnbError = require('../XnbError');

const AudioEngine = require('./AudioEngine');
const SoundBank = require('./SoundBank');
const WaveBank = require('./WaveBank');

// WaveBank Constants
const WBND_ENTRY_NAMES = 0x00010000; // bank includes entry names
const WBND_COMPACT = 0x00020000; // bank uses compact format
const WBND_SYNC_DISABLED = 0x00040000; // bank is disabled for audition sync
const WBND_SEEK_TABLES = 0x00080000; // bank includes seek tables
const WBND_MASK = 0x000F0000;

/**
 * Used to pack and unpack xact files
 * @class
 * @public
 */
class Xact {

    /**
     * Used to load a specific file.
     * @public
     * @static
     * @param {String} filename
     */
    static load(filename) {
        // get the extention name from the file
        const ext = path.extname(filename).toLowerCase().slice(1);

        // check our valid files
        switch (ext) {
            // AudioEngine
            case 'xgs':
                // create instance of the audio engine
                const audioEngine = new AudioEngine();
                // load the audio engine file
                audioEngine.load(filename);
                break;
            case 'xsb':
                SoundBank.load(filename);
                break;
            default:
                throw new XnbError(`Invalid file!`);
        }
    }

    /**
     * Processes the WaveBank file
     * @param {BufferReader} buffer
     */
    processWaveBank(buffer) {
        const waveBankHeader = new WaveBankHeader();
        const waveBankData = new WaveBankData();
        const waveBankEntry = new WaveBankEntry();

        let wavebank_offset = 0;

        waveBankHeader.version = buffer.readUInt32();
        Log.debug(`Version: ${waveBankHeader.version}`);

        let last_segment = 4;
        if (waveBankHeader.version <= 3) last_segment = 3;
        if (waveBankHeader.version >= 42) buffer.seek(4);

        waveBankHeader.segments = new Array(5);
        for (let i = 0; i <= last_segment; i++) {
            waveBankHeader.segments[i] = new Segment();
            waveBankHeader.segments[i].offset = buffer.readInt32();
            waveBankHeader.segments[i].length = buffer.readInt32();
        }

        Log.debug(JSON.stringify(waveBankHeader.segments));

        buffer.seek(waveBankHeader.segments[0].offset, 0);

        // data

        waveBankData.flags = buffer.readInt32();
        Log.debug(`Flags: ${Log.h(waveBankData.flags)}`);
        waveBankData.entryCount = buffer.readInt32();
        Log.debug(`Entry Count: ${waveBankData.entryCount}`);

        if (waveBankHeader.version == 2 || waveBankHeader.version == 3)
            waveBankData.bankName = buffer.read(16).toString().replace(/\0/g, '');
        else
            waveBankData.bankName = buffer.read(64).toString().replace(/\0/g, '');

        Log.debug(`Bank Name: ${waveBankData.bankName}`);

        let _bankName = waveBankData.bankName;

        if (waveBankHeader.version == 1)
            waveBankData.entryMetaDataElementSize = 20;
        else {
            waveBankData.entryMetaDataElementSize = buffer.readInt32();
            waveBankData.entryNameElementSize = buffer.readInt32();
            waveBankData.alignment = buffer.readInt32();
            wavebank_offset = waveBankHeader.segments[1].offset; // metadatasegment
        }

        if ((waveBankData.flags & WBND_COMPACT) != 0)
            buffer.seek(4); // compact format

        let playregion_offset = waveBankHeader.segments[last_segment].offset;
        if (playregion_offset == 0)
            playregion_offset = wavebank_offset + (waveBankData.entryCount * waveBankData.entryMetaDataElementSize);

        let segidx_entry_name = 2;
        if (waveBankHeader.version >= 42) segidx_entry_name = 3;
        if (waveBankHeader.segments[segidx_entry_name].offset != 0 &&
            waveBankHeader.segments[segidx_entry_name].length != 0) {
            if (waveBankData.entryNameElementSize == -1)
                waveBankData.entryNameElementSize = 0;
            //let entry_name =
        }

        const _sounds = new Array(waveBankHeader.entryCount);

        for (let current_entry = 0; current_entry < waveBankData.entryCount; current_entry++) {
            buffer.seek(wavebank_offset, 0);
            // showfileoff

            waveBankEntry.loopRegionLength = 0;
            waveBankEntry.loopRegionOffset = 0;

            if ((waveBankData.flags & WBND_COMPACT) != 0) {
                let len = buffer.readInt32();
                waveBankEntry.format = waveBankData.compactFormat;
                waveBankEntry.playRegion.offset = (len & ((1 << 21) - 1)) * waveBankData.alignment;
                waveBankEntry.playRegion.length = (len >> 21) & ((1 << 11) - 1);

                buffer.seek(wavebank_offset + waveBankEntry.entryMetaDataElementSize, 0);

                if (current_entry == (waveBankEntry.entryCount - 1))
                    len = waveBankHeader.segments[last_segment].length;
                else
                    len = ((buffer.readInt32() & ((1 << 21) - 1)) * waveBankEntry.alignment);

                length = len - offset;
            }
            else {
                if (waveBankHeader.version == 1) {
                    waveBankEntry.format = buffer.readInt32();
                    waveBankEntry.playRegion.offset = buffer.readInt32();
                    waveBankEntry.playRegion.length = buffer.readInt32();
                    waveBankEntry.loopRegion.offset = buffer.readInt32();
                    waveBankEntry.loopRegion.offset = buffer.readInt32();
                }
                else {
                    if (waveBankData.entryMetaDataElementSize >= 4)
                        waveBankEntry.flagsAndDuration = buffer.readInt32();

                    if (waveBankData.entryMetaDataElementSize >= 8)
                        waveBankEntry.format = buffer.readInt32();

                    if (waveBankData.entryMetaDataElementSize >= 12)
                        waveBankEntry.playRegion.offset = buffer.readInt32();

                    if (waveBankData.entryMetaDataElementSize >= 16)
                        waveBankEntry.playRegion.length = buffer.readInt32();

                    if (waveBankData.entryMetaDataElementSize >= 20)
                        waveBankEntry.loopRegion.offset = buffer.readInt32();

                    if (waveBankData.entryMetaDataElementSize >= 24)
                        waveBankEntry.loopRegion.length = buffer.readInt32();
                }

                if (waveBankData.entryMetaDataElementSize < 24)
                    if (waveBankEntry.playRegion.length != 0)
                        waveBankEntry.playRegion.length = waveBankHeader.segments[last_segment].length;
            }

            wavebank_offset += waveBankData.entryMetaDataElementSize;
            waveBankEntry.playRegion.offset += playregion_offset;

            // parse WAVEBANKMINWAVEFORMAT

            // MiniFormatTag codec
            let chans, rate, align, codec;

            if (waveBankHeader.version == 1) {
                codec = waveBankEntry.format & ((1 << 2) - 1);
                chans = (waveBankEntry.format >> 2) & ((1 << 3) - 1);
                rate = (waveBankEntry.format >> 2 (2 + 3)) & ((1 << 18) - 1);
                align = (waveBankEntry.format >> (2 + 3 + 18)) & ((1 << 8) - 1);

                Log.debug(`Codec: ${Log.h(codec)}`);
                Log.debug(`Channels: ${chans}`);
                Log.debug(`Rate: ${rate}`);
                Log.debug(`Align: ${align}`);
            }

            buffer.seek(waveBankEntry.playRegion.offset, 0);

            const audioData = new Array(waveBankEntry.playRegion.length);

            // call the special constructor on sound effect to sort it out
        }
    }

}

class Variable {
    constructor() {
        this.name = '';
        this.value = 0.0;

        this.isGlobal = false;
        this.isReadOnly = false;
        this.isPublic = false;
        this.isReserved = false;

        this.initValue = 0.0;
        this.maxValue = 0.0;
        this.minValue = 0.0;
    }
}

const RpcPointType = {
    Linear: 0,
    Fast: 1,
    Slow: 2,
    SinCos: 3
};

class RpcPoint {
    constructor() {
        this.x = 0.0;
        this.y = 0.0;
        this.type = 0;
    }
}

const RpcParmeter = {
    Volume: 0,
    Pitch: 1,
    ReverbSend: 2,
    FilterFrequency: 3,
    FilterQFactor: 4
};

class RpcCurve {
    constructor() {
        this.variable = 0;
        this.parameter = 0;
        this.points = [];
    }
}

class Segment {
    constructor() {
        this.offset = 0;
        this.length = 0;
    }
}

class WaveBankEntry {
    constructor() {
        this.format = 0;
        this.playRegion = new Segment();
        this.loopRegion = new Segment();
        this.flagsAndDuration = 0;
    }
}

class WaveBankHeader {
    constructor() {
        this.version = 0;
        this.segments = [];
    }
}

class WaveBankData {
    constructor() {
        this.flags = 0;
        this.entryCount = 0;
        this.bankName = '';
        this.entryMetaDataElementSize = 0;
        this.entryNameElementSize = 0;
        this.alignment = 0;
        this.compactFormat = 0;
        this.buildTime = 0;
    }
}

module.exports = Xact;
