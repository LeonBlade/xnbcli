const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const BufferWriter = require('../../BufferWriter');

/**
 * Int32 Reader
 * @class
 * @extends BaseReader
 */
class ReflectiveReader extends BaseReader {
    /**
     * Reads Reflection data from buffer.
     * @param {BufferReader} buffer
     * @returns {Mixed}
     */
    read(buffer) {
        
    }

    /**
     * Writes Reflection data and returns buffer
     * @param {BufferWriter} buffer
     * @param {Number} content
     * @param {ReaderResolver} resolver
     */
    write(buffer, content, resolver) {
        this.writeIndex(buffer, resolver);
        buffer.writeInt32(content);
    }
}

module.exports = Int32Reader;
