const TypeReader = require('./TypeReader');
const Log = require('../Log');
const BufferReader = require('../BufferReader');
const XnbError = require('../XnbError');

/**
 * Class used to read the XNB types using the readers
 * @class
 */
class ReaderResolver {
    /**
     * Creating a new instance of ReaderResolver
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
        if (this.readers[index] == null)
            throw new XnbError(`Invalid reader index ${index}`);
        // read the buffer using the selected reader
        return this.readers[index].read(buffer, this);
    }
}

module.exports = ReaderResolver;
