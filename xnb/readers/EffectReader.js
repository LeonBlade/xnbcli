const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');
const UInt32Reader = require('./UInt32Reader');

/**
 * Effect Reader
 * @class
 * @extends BaseReader
 */
class EffectReader extends BaseReader {
    read(buffer) {
        const uint32Reader = new UInt32Reader();

        let size = uint32Reader.read(buffer);
        let bytecode = buffer.read(size);

        return { export: { type: this.type, data: bytecode } };
    }

    isValueType() {
        return false;
    }
}

module.exports = EffectReader;
