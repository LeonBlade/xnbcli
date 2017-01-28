const BufferReader = require('./BufferReader');
const TypeReader = require('./TypeReader');

/**
 * Class for content reader used to read the XNB file contents
 * @class
 */
class ContentReader {
    /**
     * Creating a new instance of ContentReader
     * @constructor
     * @param {TypeReader[]} readers Array of TypeReaders
     */
    constructor(readers) {
        /**
         * Array of type readers
         * @type {TypeReader[]}
         */
        this.readers = readers;
    }

    /**
     * Read the XNB file contents
     * @method read
     * @public
     * @param {BufferReader} buffer The buffer to read from.
     */
    read(buffer) {
        // read the index of which reader to use
        let index = buffer.read7BitNumber() - 1;
        // read the buffer using the selected reader
        return this.readers[index].read(buffer, this);
    }
}

module.exports = ContentReader;
