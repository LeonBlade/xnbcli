const fs = require('fs');
const Log = require('./Log');
const XnbError = require('./XnbError');

class BufferReader {

    /**
     * Creates instance of Reader class.
     * @constructor
     * @param {String} filename The filename to read with the reader.
     */
    constructor(filename) {
        // ensure the file exists
        if (!fs.existsSync(filename))
            throw new XnbError(`"${filename}" does not exist!`);
        /**
         * internal buffer for the reader
         * @private
         * @type {Buffer}
         */
        this._buffer = fs.readFileSync(filename);

        /**
         * Seek index for the internal buffer.
         * @private
         * @type {Number}
         */
        this._index = 0;

        /**
         * Internal buffer stack to hold onto things that are read
         * @access private
         * @type {mixed[]}
         */
        this._bufferStack = [];
    }

    /**
     * Get the last read buffer.
     * @public
     * @method lastRead
     * @return {mixed} Reurns the last read buffer.
     */
    get lastRead() {
        return this._bufferStack[this._bufferStack.length - 1];
    }

    /**
    * Seeks to a specific index in the buffer.
    * @public
    * @property seek
    * @param {Number} index Sets the buffer seek index.
    */
    set seek(index) {
        this._index = Number.parseInt(index);
    }

    /**
     * Gets the seek index of the buffer.
     * @public
     * @property seek
     * @return {Number} Reurns the buffer seek index.
     */
    get seek() {
        return Number.parseInt(this._index);
    }

    /**
     * Get the buffer size
     * @public
     * @property size
     * @return {Number} Returns the size of the buffer.
     */
    get size() {
        return this._buffer.length;
    }

    /**
     * Reads a specific number of bytes.
     * @public
     * @method read
     * @param {Number} count Number of bytes to read.
     * @param {Boolean} [seek] If you want the seeker index to advance on read.
     * @returns {Buffer} Contents of the buffer.
     */
    read(count, seek = true) {
        // read from the buffer
        let buffer = this._buffer.slice(this._index, this._index + count);
        // advance seek index if specified
        if (seek) this._index += count;

        // push the buffer into the stack
        this._bufferStack.push(buffer);

        // return the read buffer
        return buffer;
    }

    /**
     * Reads a 7-bit number.
     * @method read7BitNumber
     * @returns {Number} Returns the number read.
     */
    read7BitNumber() {
        let result = 0;
        let bitsRead = 0;
        let value;

        // loop over bits
        do {
            value = this.read(1).readUInt8();
            result |= (value & 0x7F) << bitsRead;
            bitsRead += 7;
        }
        while (value & 0x80);

        // push result into buffer stack
        this._bufferStack.push(result);

        return result;
    }

    /**
     * Read in a string.
     * @method readString
     * @returns {String} String read from buffer.
     */
    readString() {
        // read the string size
        let size = this.read7BitNumber();
        // return the string read
        return this.read(size).toString('utf8');
    }
}

// export the BufferReader class
module.exports = BufferReader;
