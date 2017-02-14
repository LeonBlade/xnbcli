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
