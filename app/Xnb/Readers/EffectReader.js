const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const BufferWriter = require('../../BufferWriter');
const UInt32Reader = require('./UInt32Reader');

/**
 * Effect Reader
 * @class
 * @extends BaseReader
 */
class EffectReader extends BaseReader {

    read(buffer) {
        const uint32Reader = new UInt32Reader();

        const size = uint32Reader.read(buffer);
        const bytecode = buffer.read(size);

        return { export: { type: this.type, data: bytecode } };
    }

    /**
     * Writes Effects into the buffer
     * @param {BufferWriter} buffer
     * @param {Mixed} data The data
     * @param {ReaderResolver} resolver
     */
    write(buffer, content, resolver) {
        this.writeIndex(buffer, resolver);

        const uint32Reader = new UInt32Reader();

        uint32Reader.write(buffer, content.data.length, null);
        buffer.concat(content.data);
    }

    isValueType() {
        return false;
    }
}

module.exports = EffectReader;
