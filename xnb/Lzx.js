const Log = require('./Log');
const BufferReader = require('./BufferReader');
const XnbError = require('./XnbError');

// LZX Constants
const MIN_MATCH = 2; // smallest allowable match length
const MAX_MATCH = 257; // largest allowable match length
const NUM_CHARS = 256; // number of uncompressed character types
const BLOCKTYPE = {
    INVALID: 0,
    VERBATIM: 1,
    ALIGNED: 2,
    UNCOMPRESSED: 3
};
const PRETREE_NUM_ELEMENTS = 20;
const ALIGNED_NUM_ELEMENTS = 8; // aligned offset tree elements
const NUM_PRIMARY_LENGTHS = 7;
const NUM_SECONDARY_LENGTHS = 249; // number of elements in length tree

// LZX Huffman Constants
const PRETREE_MAXSYMBOLS = PRETREE_NUM_ELEMENTS;
const PRETREE_TABLEBITS = 6;
const MAINTREE_MAXSYMBOLS = NUM_CHARS + 50 * 8;
const MAINTREE_TABLEBITS = 12;
const LENGTH_MAXSYMBOLS = NUM_SECONDARY_LENGTHS + 1;
const LENGTH_TABLEBITS = 12;
const ALIGNED_MAXSYMBOLS = ALIGNED_NUM_ELEMENTS;
const ALIGNED_TABLEBITS = 7;
const LENTABLE_SAFETY = 64; // table decoding overruns are allowed

/**
 * LZX Static Data Tables
 *
 * LZX uses 'position slots' to represent match offsets.  For every match,
 * a small 'position slot' number and a small offset from that slot are
 * encoded instead of one large offset.
 *
 * position_base[] is an index to the position slot bases
 *
 * extra_bits[] states how many bits of offset-from-base data is needed.
 */
const position_base = [];
const extra_bits = [];

/**
 *
 * Header
 *
 * Block
 *
 * Block
 *
 * Block
 *
 * ...
 *
 */

class Lzx {

    /**
     * Creates an instance of LZX with a given window frame.
     * @constructor
     * @param {Number} window_bits
     */
    constructor(window_bits) {
        // get the window size from window bits
        this.window_size = 1 << window_bits;

        // LZX supports window sizes of 2^15 (32 KB) to 2^21 (2 MB)
        if (window_bits < 15 || window_bits > 21)
            throw new XnbError('Window size out of range!');

        // initialize the state

        // initialize static tables
        if (!extra_bits.length) {
            for (let i = 0, j = 0; i <= 50; i += 2) {
                extra_bits[i] = extra_bits[i + 1] = j;
                if (i != 0 && j < 17)
                    j++;
            }
        }
        if (!position_base.length) {
            for (let i = 0, j = 0; i <= 50; i++) {
                position_base[i] = j;
                j += 1 << extra_bits[i];
            }
        }

        Log.debug(`Extra Bits:`);
        Log.debug(JSON.stringify(extra_bits));
        Log.debug(`Position Base:`);
        Log.debug(JSON.stringify(position_base));

        /**
         * calculate required position slots
         *
         * window bits:     15 16 17 18 19 20 21
         * position slots:  30 32 34 36 38 42 50
         */
        const posn_slots = (window_bits == 21 ? 50 : (window_bits == 20 ? 42 : window_bits << 1));

        // set the number of main elements
        this.main_elements = NUM_CHARS + (posn_slots << 3);

        // Repeated Offsets
        this.R0 = this.R1 = this.R2 = 1;
    }

    /**
     * Decompress the buffer with given frame and block size
     * @param {BufferReader} buffer
     * @param {Number} frame_size
     * @param {Number} block_size
     * @returns {Buffer}
     */
    decompress(buffer, frame_size, block_size) {
        // read the intel call
        const intel = buffer.readLZXBits(1);
        Log.debug(`Intel: ${Log.b(intel, 1)} = ${intel}`);

        // don't care about intel e8
        if (intel != 0)
            throw new XnbError(`Intel E8 not 0!`);

        // TODO: loop over blocks

        // read in the block type
        const block_type = buffer.readLZXBits(3);
        Log.debug(`Blocktype: ${Log.b(block_type, 3)} = ${block_type}`);

        // TODO: switch over block type

        // NOTE: this is assuming a VERBATIM blocktype

        // read 24-bit value for uncompressed bytes in this block
        const hi = buffer.readLZXBits(16);
        const lo = buffer.readLZXBits(8);
        // number of uncompressed bytes for this block
        const block_remaining = (hi << 8) | lo;

        Log.debug(`Block Remaining: ${block_remaining}`);


/**
 *
 * ReadLengths(m_state.MAINTREE_len, 0, 256, bitbuf);
 * ReadLengths(byte[] lens, uint first, uint last, BitBuffer bitbuf)
 *
 * first = 0, last = 256
 *
 * BUILD TABLE:
 * MakeDecodeTable(LzxConstants.PRETREE_MAXSYMBOLS, LzxConstants.PRETREE_TABLEBITS, m_state.PRETREE_len,
                m_state.PRETREE_table);

 * MakeDecodeTable(uint nsyms, uint nbits, byte[] length, ushort[] table)
 *
 * nsyms = PRETREE_MAXSYMBOLS = PRETREE_NUM_ELEMENTS = 20
 * nbits = PRETREE_TABLEBITS = 6
 * length[] = PRETREE_len (just set above in ReadLengths)
 * table[] = PRETREE_table
 *
 */

        // TODO: this should be in state

        const PRETREE_len = [];
        const PRETREE_second = [];

        // read lengths for pre-tree (20 symbols, lengths stored in fixed 4 bits)
        for (let i = 0; i < 20; i++) {
            let code = buffer.readLZXBits(4);
            PRETREE_len.push(code);
        }

        // TODO: build decode table for pre-tree

        Log.debug('Pre-tree for main tree');
        Log.debug(JSON.stringify(PRETREE_len));

        // TODO: make decode table
        // NOTE: Assume that we have a pre-tree with codes between 0-16 so no additional reads are needed

        for (let i = 0; i < 20; i++) {
            let code = buffer.readLZXBits(4);
            PRETREE_second.push(code);
        }

        Log.debug('Pre-tree for remainder of main tree');
        Log.debug(JSON.stringify(PRETREE_second));

        process.exit(1);
    }

    /**
     * Reads in code lengths for symbols first to last in the given table
     * The code lengths are stored in their own special LZX way.
     * @public
     * @method readLengths
     * @param {BufferReader} buffer
     * @param {Array} table
     * @param {Number} first
     * @param {Number} last
     * @returns {Array}
     */
    readLengths(buffer, first, last) {

        // TODO: write to state not a local variable
        // create pre-tree length array
        const PRETREE_len = [];

        // create the table array to return
        const table = [];

        // read in the 4-bit pre-tree deltas
        for (let i = 0; i < 20; i++)
            PRETREE_len[i] = buffer.readLZXBits(4);

        // TODO: build table of pre-tree

        // loop through the lengths from first to last
        for (let i = first; i < last;) {

            let sym = 0; // TODO: read huff sym

            // iterate over the possible tree codes read from the pre-tree table

            // code = 17, run of ([read 4 bits] + 4) zeros
            if (sym == 17) {
                let zeros = buffer.readLZXBits(4) + 4;
                while (zeros-- != 0)
                    table[i++] = 0;
            }
            // code = 18, run of ([read 5 bits] + 20) zeros
            else if (sym == 18) {
                // read in number of zeros as a 5-bit number + 20
                let zeros = buffer.readLZXBits(5) + 20;
                // add the number of zeros into the table array
                while (zeros-- != 0)
                    table[i++] = 0;
            }
            // code = 19 run of ([read 1 bit] + 4) [read huffman symbol]
            else if (sym == 19) {
                let same = buffer.readLZXBits(1) + 4;
                // TODO: read huff sym
                sym = table[i] - sym;
                if (sym < 0)
                    sym += 17;
                while (same-- != 0)
                    table[i++] = sym;
            }
            // code 0 -> 16, delta current length entry
            else {
                sym = table[i] - sym;
                if (sym < 0)
                    sym += 17;
                table[i++] = sym;
            }
        }

        // return the table created
        return table;
    }


    readHuffSymbol(buffer, table, length) {

    }

    /**
     * Sets the shortest match.
     * @param {Number} X
     */
    set R(X) {
        // No match, R2 <- R1, R1 <- R0, R0 <- X
        if (this.R0 != X && this.R1 != X && this.R2 != X) {
            // shift all offsets down
            this.R2 = this.R1;
            this.R1 = this.R0;
            this.R0 = X;
        }
        // X = R1, Swap R0 <-> R1
        else if (this.R1 == X) {
            let R1 = this.R1;
            this.R1 = this.R0;
            this.R0 = R1;
        }
        // X = R2, Swap R0 <-> R2
        else if (this.R2 == X) {
            let R2 = this.R2;
            this.R2 = this.R0;
            this.R0 = R2;
        }
    }

    /**
     * Gets the real offset given an encoded one
     * @param {Number} offset Encoded offset
     * @returns {Number} Real offset
     */
    getOffset(offset) {
        // if the encoded offset is 0 - 2 then return the repeated offset
        if (offset == 0)
            return this.R0;
        else if (offset == 1)
            return this.R1;
        else if (offset == 2)
            return this.R2;

        // otherwise return a real offset
        return offset - 2;
    }
}

module.exports = Lzx;
