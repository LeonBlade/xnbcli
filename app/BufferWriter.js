class BufferWriter {

    constructor(size = 500) {
        // the buffer to write to
        this._buffer = Buffer.alloc(size);
        // the current byte position
        this.bytePosition = 0;
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

    trim() {
        const tBuffer = Buffer.alloc(Number.parseInt(this.bytePosition));
        this._buffer.copy(tBuffer, 0, 0, this.bytePosition);
        this._buffer = tBuffer;
    }

    /**
     * Allocates number of bytes into the buffer and assigns more space if needed
     * @param {Number} bytes Number of bytes to allocate into the buffer
     */
    alloc(bytes) {
        if (this._buffer.length <= this.bytePosition + bytes) {
            let tBuffer = Buffer.alloc(this._buffer.length + bytes);
            this._buffer.copy(tBuffer, 0);
            this._buffer = tBuffer;
        }
        return this;
    }

    write(bytes) {
        this.alloc(bytes.length).buffer.write(bytes, this.bytePosition);
        this.bytePosition += bytes.length;
    }

    writeByte(byte) {
        this.alloc(1).buffer.writeUInt8(byte, this.bytePosition);
        this.bytePosition++;
    }

    write7BitNumber(number) {
        this.alloc(2);
        do {
            let byte = number & 0x7F;
            number = number >> 7;
            if (number) byte |= 0x80;
            this.buffer.writeUInt8(byte, this.bytePosition);
            this.bytePosition++;
        }
        while (number);
    }

    writeInt32(number) {
        this.alloc(4).buffer.writeInt32LE(number, this.bytePosition);
        this.bytePosition += 4;
    }

    writeUInt32(number) {
        this.alloc(4);
        this.buffer.writeUInt32LE(number, this.bytePosition);
        this.bytePosition += 4;
    }

}

// export the BufferWriter class
module.exports = BufferWriter;