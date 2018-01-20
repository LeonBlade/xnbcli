const XnbError = require('../../XnbError');
const BufferReader = require('../../BufferReader');
const BufferWriter = require('../../BufferWriter');
const ReaderResolver = require('../ReaderResolver');

/**
 * Base class for all readers.
 * @abstract
 * @class
 */
class BaseReader {
    /**
     * Returns if type normally requires a special reader.
     * @public
     * @method
     * @returns {Boolean} Returns true if type is primitive.
     */
    isValueType() {
        return true;
    }

    /**
     * Returns string type of reader
     * @public
     * @property
     * @returns {string}
     */
    get type() {
        return this.constructor.name.slice(0, -6);
    }

    /**
     * Reads the buffer by the specification of the type reader.
     * @public
     * @param {BufferReader} buffer The buffer to read from.
     * @param {ReaderResolver} resolver The content reader to resolve readers from.
     * @returns {mixed} Returns the type as specified by the type reader.
     */
    read(buffer, resolver) {
        throw new XnbError('Cannot invoke methods on abstract class.');
    }

    /**
     * Writes Dictionary into buffer
     * @param {BufferWriter} buffer
     * @param {Object} data The data to parse for the 
     * @param {ReaderResolver} resolver ReaderResolver to write non-primitive types
     */
    write(buffer, content, resolver) {
        throw new XnbError('Cannot invoke methods on abstract class.');
    }

    /**
     * Writes the index of this reader to the buffer
     * @param {BufferWriter} buffer
     * @param {ReaderResolver} resolver 
     */
    writeIndex(buffer, resolver) {
        if (resolver != null)
            buffer.write7BitNumber(Number.parseInt(resolver.getIndex(this)) + 1);
    }

    /**
     * When printing out in a string.
     * @returns {String}
     */
    toString() {
        return this.type;
    }
}

module.exports = BaseReader;
