const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const SingleReader = require('./SingleReader');

/**
 * Vector4 Reader
 * @class
 * @extends BaseReader
 */
class Vector4Reader extends BaseReader {
    /**
     * Reads Vector4 from buffer.
     * @param {BufferReader} buffer
     * @returns {object}
     */
    read(buffer) {
        const singleReader = new SingleReader();

        let x = singleReader.read(buffer);
        let y = singleReader.read(buffer);
        let z = singleReader.read(buffer);
        let w = singleReader.read(buffer);

        return { x, y, z, w };
    }
}

module.exports = Vector4Reader;
