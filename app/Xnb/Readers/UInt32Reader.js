const BaseReader = require('./BaseReader');
const ReaderResolver = require('../ReaderResolver');
const BufferReader = require('../../BufferReader');
const BufferWriter = require('../../BufferWriter');

/**
 * UInt32 Reader
 * @class
 * @extends BaseReader
 */
class UInt32Reader extends BaseReader {
    /**
     * Reads UInt32 from buffer.
     * @param {BufferReader} buffer
     * @returns {Number}
     */
    read(buffer) {
        return buffer.readUInt32();
    }

    /**
     * 
     * @param {BufferWriter} buffer 
     * @param {Number} content 
     * @param {ReaderResolver} resolver 
     */
    write(buffer, content, resolver) {
        this.writeIndex(buffer, resolver);
        buffer.writeUInt32(content);
    }
}

module.exports = UInt32Reader;
