const fs = require('fs');
const Log = require('./Log');
const XnbError = require('./XnbError');
const chalk = require('chalk');

const LITTLE_ENDIAN = 0;
const BIG_ENDIAN = 1;

class BufferReader {

    /**
     * Creates instance of Reader class.
     * @constructor
     * @param {String} filename The filename to read with the reader.
     */
    constructor(filename, endianus = LITTLE_ENDIAN) {
        // ensure the file exists
        if (!fs.existsSync(filename))
            throw new XnbError(`"${filename}" does not exist!`);

        /**
         * Sets the endianness of the buffer stream
         * @private
         * @type {Number}
         */
        this._endianus = endianus;

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
        this._offset = 0;

        /**
         * Bit offset for bit reading.
         * @private
         * @type {Number}
         */
        this._bitOffset = 0;

        /**
         * Last debug location for logging byte locations
         * @private
         * @type {Number}
         */
        this._lastDebugLoc = 0;
    }

    /**
    * Seeks to a specific index in the buffer.
    * @public
    * @param {Number} index Sets the buffer seek index.
    * @param {Number} origin Location to seek from
    */
    seek(index, origin = this._offset) {
        const offset = this._offset;
        this._offset = Math.max(origin + Number.parseInt(index), 0);
        return this._offset - offset;
    }

    /**
     * Gets the seek index of the buffer.
     * @public
     * @property bytePosition
     * @return {Number} Reurns the buffer seek index.
     */
    get bytePosition() {
        return Number.parseInt(this._offset);
    }

    /**
     * Sets the seek index of the buffer.
     * @public
     * @property bytePosition
     * @param {Number} value
     */
    set bytePosition(value) {
        this._offset = value;
    }

    /**
     * Gets the current position for bit reading.
     * @public
     * @property _bitPosition
     * @returns {Number}
     */
    get bitPosition() {
        return Number.parseInt(this._bitOffset);
    }

    /**
     * Sets the bit position clamped at 16-bit frames
     * @public
     * @property bitPosition
     * @param {Number} offset
     */
    set bitPosition(offset) {
        // when rewinding, reset it back to
        if (offset < 0) offset = 16 - offset;
        // set the offset and clamp to 16-bit frame
        this._bitOffset = offset % 16;
        // get byte seek for bit ranges that wrap past 16-bit frames
        const byteSeek = ((offset - (Math.abs(offset) % 16)) / 16) * 2;
        // seek ahead for overflow on 16-bit frames
        this.seek(byteSeek);
    }

    /**
     * Get the buffer size.
     * @public
     * @property size
     * @return {Number} Returns the size of the buffer.
     */
    get size() {
        return this.buffer.length;
    }

    /**
     * Returns the buffer.
     * @public
     * @property buffer
     * @returns {Buffer} Returns the internal buffer.
     */
    get buffer() {
        return this._buffer;
    }

    /**
     * Writes another buffer into this buffer.
     * @public
     * @method write
     * @param {Buffer} buffer
     * @param {Number} targetIndex
     * @param {Number} sourceIndex
     * @param {Number} length
     */
    copyFrom(buffer, targetIndex = 0, sourceIndex = 0, length = buffer.length) {
        // we need to resize the buffer to fit the contents
        if (this.buffer.length < length + targetIndex) {
            // create a temporary buffer of the new size
            const tempBuffer = Buffer.alloc(this.buffer.length + (length + targetIndex - this.buffer.length));
            // copy our buffer into the temp buffer
            this.buffer.copy(tempBuffer);
            // copy the buffer given into the temp buffer
            buffer.copy(tempBuffer, targetIndex, sourceIndex, length);
            // assign our buffer to the temporary buffer
            this._buffer = tempBuffer;
        }
        else {
            // copy the buffer into our buffer
            buffer.copy(this.buffer, targetIndex, sourceIndex, length);
        }
    }

    /**
     * Reads a specific number of bytes.
     * @public
     * @method read
     * @param {Number} count Number of bytes to read.
     * @returns {Buffer} Contents of the buffer.
     */
    read(count) {
        // read from the buffer
        const buffer = this.buffer.slice(this._offset, this._offset + count);
        // advance seek offset
        this.seek(count);
        // debug this read
        //if (this._debug_mode) this.debug();
        // return the read buffer
        return buffer;
    }

    /**
     * Reads a single byte returned as a uint8
     * @public
     * @returns {Number}
     */
    readByte() {
        return this.read(1).readUInt8();
    }

    /**
     * Reads a uint16
     * @public
     * @returns {Number}
     */
    readUInt16() {
        const read = this.read(2);
        if (this._endianus == LITTLE_ENDIAN)
            return read.readUInt16LE();
        return read.readUInt16BE();
    }

    /**
     * Reads a uint32
     * @public
     * @returns {Number}
     */
    readUInt32() {
        const read = this.read(4);
        if (this._endianus == LITTLE_ENDIAN)
            return read.readUInt32LE();
        return read.readUInt32BE();
    }

    /**
     * Reads an int16
     * @public
     * @returns {Number}
     */
    readInt16() {
        const read = this.read(2);
        if (this._endianus == LITTLE_ENDIAN)
            return read.readInt16LE();
        return read.readInt16BE();
    }

    /**
     * Reads an int32
     * @public
     * @returns {Number}
     */
    readInt32() {
        const read = this.read(4);
        if (this._endianus == LITTLE_ENDIAN)
            return read.readInt16LE();
        return read.readInt32BE();
    }

    /**
     * Reads a float
     * @public
     * @returns {Number}
     */
    readSingle() {
        const read = this.read(4);
        if (this._endianus == LITTLE_ENDIAN)
            return read.readFloatLE();
        return read.readFloatBE();
    }

    /**
     * Reads a double
     * @public
     * @returns {Number}
     */
    readDouble() {
        const read = this.read(4);
        if (this._endianus == LITTLE_ENDIAN)
            return read.readDoubleLE();
        return read.readDoubleBE();
    }

    /**
     * Reads a string
     * @public
     * @param {Number} [count]
     * @returns {String}
     */
    readString(count = 0) {
        if (count === 0) {
            const chars = [];
            while (this.peekByte(1) != 0x0)
                chars.push(this.readString(1));
            this.seek(1);
            return str.join('');
        }
        return this.read(count).toString();
    }

    /**
     * Peeks ahead in the buffer without actually seeking ahead.
     * @public
     * @method peek
     * @param {Number} count Number of bytes to peek.
     * @returns {Buffer} Contents of the buffer.
     */
    peek(count) {
        // read from the buffer
        const buffer = this.read(count);
        // rewind the buffer
        this.seek(-count);
        // return the buffer
        return buffer;
    }

    /**
     * Peeks a single byte returned as a uint8
     * @public
     * @returns {Number}
     */
    peekByte() {
        return this.peek(1).readUInt8();
    }

    /**
     * Peeks a uint16
     * @public
     * @returns {Number}
     */
    peekUInt16() {
        if (this._endianus == LITTLE_ENDIAN)
            return this.peek(2).readUInt16LE();
        return this.peek(2).readUInt16BE();
    }

    /**
     * Peeks a uint32
     * @public
     * @returns {Number}
     */
    peekUInt32() {
        if (this._endianus == LITTLE_ENDIAN)
            return this.peek(4).readUInt32LE();
        return this.peek(4).readUInt32BE();
    }

    /**
     * Peeks an int16
     * @public
     * @returns {Number}
     */
    peekInt16() {
        if (this._endianus == LITTLE_ENDIAN)
            return this.peek(2).readInt16LE();
        return this.peek(2).readInt16BE();
    }

    /**
     * Peeks an int32
     * @public
     * @returns {Number}
     */
    peekInt32() {
        if (this._endianus == LITTLE_ENDIAN)
            return this.peek(4).readInt32LE();
        return this.peek(4).readInt32BE();
    }

    /**
     * Peeks a float
     * @public
     * @returns {Number}
     */
    peekSingle() {
        if (this._endianus == LITTLE_ENDIAN)
            return this.peek(4).readFloatLE();
        return this.peek(4).readFloatBE();
    }

    /**
     * Peeks a double
     * @public
     * @returns {Number}
     */
    peekDouble() {
        if (this._endianus == LITTLE_ENDIAN)
            return this.peek(4).readDoubleLE();
        return this.peek(4).readDoubleBE();
    }

    /**
     * Peeks a string
     * @public
     * @param {Number} [count]
     * @returns {String}
     */
    peekString(count = 0) {
        if (count === 0) {
            const bytePosition = this.bytePosition;
            const chars = [];
            while (this.peekByte(1) != 0x0)
                chars.push(this.readString(1));
            this.bytePosition = bytePosition;
            return str.join('');
        }
        return this.peek(count).toString();
    }

    /**
     * Reads a 7-bit number.
     * @public
     * @method read7BitNumber
     * @returns {Number} Returns the number read.
     */
    read7BitNumber() {
        let result = 0;
        let bitsRead = 0;
        let value;

        // loop over bits
        do {
            value = this.readByte();
            result |= (value & 0x7F) << bitsRead;
            bitsRead += 7;
        }
        while (value & 0x80);

        return result;
    }

    /**
     * Reads bits used for LZX compression.
     * @public
     * @method readLZXBits
     * @param {Number} bits
     * @returns {Number}
     */
    readLZXBits(bits) {
        // initialize values for the loop
        let bitsLeft = bits;
        let read = 0;

        // read bits in 16-bit chunks
        while (bitsLeft > 0) {
            // peek in a 16-bit value
            const peek = this.peek(2).readUInt16LE();

            // clamp bits into the 16-bit frame we have left only read in as much as we have left
            const bitsInFrame = Math.min(Math.max(bitsLeft, 0), 16 - this.bitPosition);
            // set the offset based on current position in and bit count
            const offset = 16 - this.bitPosition - bitsInFrame;

            // create mask and shift the mask up to the offset <<
            // and then shift the return back down into mask space >>
            const value = (peek & (2 ** bitsInFrame - 1 << offset)) >> offset;

            // Log.debug(Log.b(peek, 16, this.bitPosition, this.bitPosition + bitsInFrame));

            // remove the bits we read from what we have left
            bitsLeft -= bitsInFrame;
            // add the bits read to the bit position
            this.bitPosition += bitsInFrame;

            // assign read with the value shifted over for reading in loops
            read |= value << bitsLeft;
        }

        // return the read bits
        return read;
    }

    /**
     * Used to peek bits.
     * @public
     * @method peekLZXBits
     * @param {Number} bits
     * @returns {Number}
     */
    peekLZXBits(bits) {
        // get the current bit position to store
        let bitPosition = this.bitPosition;
        // get the current byte position to store
        let bytePosition = this.bytePosition;

        // read the bits like normal
        const read = this.readLZXBits(bits);

        // just rewind the bit position, this will also rewind bytes where needed
        this.bitPosition = bitPosition;
        // restore the byte position
        this.bytePosition = bytePosition;

        // return the peeked value
        return read;
    }

    /**
     * Reads a 16-bit integer from a LZX bitstream
     *
     * bytes are reverse as the bitstream sequences 16 bit integers stored as LSB -> MSB (bytes)
     * abc[...]xyzABCDEF as bits would be stored as:
     * [ijklmnop][abcdefgh][yzABCDEF][qrstuvwx]
     *
     * @public
     * @method readLZXInt16
     * @param {Boolean} seek
     * @returns {Number}
     */
    readLZXInt16(seek = true) {
        // read in the next two bytes worth of data
        const lsB = this.readByte();
        const msB = this.readByte();

        // rewind the seek head
        if (!seek)
            this.seek(-2);

        // set the value
        return (lsB << 8) | msB;
    }

    /**
     * Aligns to 16-bit offset.
     * @public
     * @method align
     */
    align() {
        if (this.bitPosition > 0)
            this.bitPosition += 16 - this.bitPosition;
    }

    /**
     * Used only for error logging.
     * @public
     */
    debug() {
        // store reference to the byte position
        const bytePosition = this.bytePosition;
        // move back by 8 bytes
        const diff = Math.abs(this.seek(-8));
        // read 16 bytes worth of data into an array
        const read = this.peek(17).values();
        const bytes = [];
        const chars = [];
        let i = 0;
        for (let byte of read) {
            bytes.push('00'.slice(0, 2 - byte.toString(16).length) + byte.toString(16).toUpperCase());
            let char;
            if (byte > 0x1f && byte < 0x7E)
                char = String.fromCharCode(byte);
            else
                char = ' ';
            chars.push(char);
            i++;
        }
        const ldlpos = diff - (bytePosition - this._lastDebugLoc);
        // replace the selected byte with brackets
        bytes[diff] = chalk.black.bgBlue(bytes[diff]);
        bytes[ldlpos] = chalk.black.bgMagenta(bytes[ldlpos]);

        // log the message
        console.log(bytes.join(' '));
        console.log(chalk.gray(chars.join('  ')));

        // re-seek back
        this.seek(bytePosition, 0);
        // update last debug loc
        this._lastDebugLoc = bytePosition;
    }
}

// export the BufferReader class
module.exports = BufferReader;
