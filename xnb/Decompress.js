const fs = require('fs');
const Lzx = require('./Lzx');
const BufferReader = require('./BufferReader');
const XnbError = require('./XnbError');
const Log = require('./Log');

/**
 * Used to decompress LZX.
 * @class
 */
class Decompress {

    /**
     * Creates the decompress instance.
     * @constructor
     * @param {BufferReader} buffer
     * @returns {BufferReader}
     */
    constructor(buffer) {
        /**
         * BufferReader for decompression
         * @type {BufferReader}
         */
        this.buffer = buffer;
    }

    /**
     * Decompress a certain amount of bytes.
     * @param {Number} compressed
     * @returns {BufferReader}
     */
    decompress(compressed) {
        // flag is for determining if frame_size is fixed or not
        const flag = this.buffer.read(1).readUInt8();

        // allocate variables for block and frame size
        let block_size;
        let frame_size;

        // create the LZX instance with 16-bit window frame
        const lzx = new Lzx(16);

        // if flag is set to 0xFF that means we will read in frame size
        if (flag == 0xFF) {
            // read in the block size
            block_size = this.buffer.readLZXInt16();
            // read in the frame size
            frame_size = this.buffer.readLZXInt16();
        }
        else {
            // rewind the buffer
            this.buffer.seek(-1);
            // read in the block size
            block_size = this.buffer.readLZXInt16(this.buffer);
            // set the frame size
            frame_size = 0x8000;
        }

        // ensure the block and frame size aren't empty
        if (block_size == 0 || frame_size == 0)
            return; //break;  TODO: add loop

        // ensure the block and frame size don't exceed size of integers
        if (block_size > 0x10000 || frame_size > 0x10000)
            throw new XnbError('Invalid size read in compression content.');

        Log.debug(`Block Size: ${block_size}, Frame Size: ${frame_size}`);

        // TODO: decommpress the frame/block
        // TODO: write output of decompression to a buffer to return
        lzx.decompress(this.buffer, frame_size, block_size);

        process.exit(1);
    }
}

module.exports = Decompress;
