const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');
const SingleReader = require('./SingleReader');

/**
 * Vector3 Reader
 * @class
 * @extends BaseReader
 */
class Vector3Reader extends BaseReader {
    /**
     * Reads Vector3 from buffer.
     * @param {BufferReader} buffer
     * @returns {object}
     */
    read(buffer) {
        const singleReader = new SingleReader();

        let x = singleReader.read(buffer);
        let y = singleReader.read(buffer);
        let z = singleReader.read(buffer);

        return { x, y, z };
    }
}

module.exports = Vector3Reader;
