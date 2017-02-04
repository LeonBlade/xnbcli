
const position_base = [];
const extra_bits = [];

class LzxDecoder {

    // static uint[] position_base
    // static byte[] extra_bits

    /**
     * @constructor
     * @param {Number} window_bits
     */
    constructor(window_bits) {
        let window_size = 1 << window_bits;
        if (window_bits < 15 || window_bits > 21)
            throw new Error('DECR_DATAFORMAT');

        // initialize state
        /**
         * @type {LzxState}
         */
        this._state = new LzxState();
        this._state.window = [];
        for (let i = 0; i < window_size; i++)
            this._state.window.push(0xDC);
        this._state.window_size = window_size;
        this._state_window_posn = 0;



        // initialize static tables
        if (extra_bits == null) {
            extra_bits = [];
            j = 0;
            for (let i = 0; i <= 50; i += 2) {
                extra_bits[i] = j;
                extra_bits[i + 1] = j;
                if ((i != 0) && (j < 17))
                    j++;
            }
        }
        if (position_base == null) {
            position_base = [];
            j = 0;
            for (let i = 0; i <= 50; i++) {
                position_base.push(j);
                j += 1 << extra_bits[i];
            }
        }

        // calculate required position slots
        let posn_slots;
        if (window_bits == 20)
            posn_slots = 42;
        else if (window_bits == 21)
            posn_slots = 50;
        else
            posn_slots = window_bits << 1;

        // reset state
        this._state.R0 = 1;
        this._state.R1 = 1;
        this._state.R2 = 1;
        this._state.main_elements = LzxConstants.NUM_CHARS + (posn_slots << 3);
        this._state.header_read = false;
        this._state.block_remaining = 0;
        this._state.block_type = LzxConstants.BLOCKTYPE.INVALID;

        // initialize tables to 0 (because deltas will be applied to them)
        for (let i = 0; i < LzxConstants.MAINTREE_MAXSYMBOLS; i++)
            this._state.MAINTREE_len[i] = 0;
        for (let i = 0; i < LzxConstants.LENGTH_MAXSYMBOLS; i++)
            this._state.LENGTH_len[i] = 0;
    }

    /**
     * @param {Number[]} outBuf
     * @param {Number} outLen
     * @param {Number[]} inBuf
     * @param {Number} inLen
     */
    Decompress(outBuf, outLen, inBuf, inLen) {
        let bitbuf = new BitBuffer(inBuf, inLen);

        let window = this._state.window;

        let window_posn = this._state.window_posn;
        let window_size = this._state.window_size;
        let R0 = this._state.R0;
        let R1 = this._state.R1;
        let R2 = this._state.R2;
        let i, j;

        let togo = outLen;
        let this_run;
        let main_element;
        let match_length;
        let match_offset;
        let length_footer;
        let extra;
        let verbatim_bits;
        let rundest;
        let runsrc;
        let copy_length;
        let aligned_bits;

        // read header if necessary
        if (!this._state.header_read) {
            let intel = bitbuf.ReadBits(1);
            if (intel != 0) {
                i = bitbuf.ReadBits(16);
                j = bitbuf.ReadBits(8);
                throw new Error('DECR_INTELTRANFORM');
            }
            this._state.header_read = true;
        }

        // main decoding loop
        while (togo > 0) {
            // last block finished, new block expected
            if (this._state.block_remaining == 0) {
                this._state.block_type = bitbuf.ReadBits(3);
                i = bitbuf.ReadBits(16);
                j = bitbuf.ReadBits(8);
                this._state.block_lengh = ((i << 8) | j)
                this._state.block_remaining = this._state.block_lengh;

                switch (this._state.block_type) {
                    case LzxConstants.BLOCKTYPE.ALIGNED:
                        j = 0;
                        for (i = 0; i < 8; i++) {
                            j = bitbuf.ReadBits(3);
                            this._state.ALIGNED_len[i] = j;
                        }
                        this._MakeDecodeTable(
                            LzxConstants.ALIGNED_MAXSYMBOLS,
                            LzxConstants.ALIGNED_TABLEBITS,
                            this._state.ALIGNED_len,
                            this._state.ALIGNED_table
                        );

                    case LzxConstants.BLOCKTYPE.VERBATIM:
                        this._ReadLengths(this._state.MAINTREE_len, 0, 256, bitbuf);
                        this._ReadLengths(this._state.MAINTREE_len, 256, this._state.main_elements, bitbuf);
                        this._MakeDecodeTable(
                            LzxConstants.MAINTREE_MAXSYMBOLS,
                            LzxConstants.MAINTREE_TABLEBITS,
                            this._state.MAINTREE_len,
                            this._state.MAINTREE_table
                        );
                        this._ReadLengths(
                            this._state.LENGTH_len,
                            0,
                            LzxConstants.NUM_SECONDARY_LENGTHS,
                            bitbuf
                        );
                        this._MakeDecodeTable(
                            LzxConstants.LENGTH_MAXSYMBOLS,
                            LzxConstants.LENGTH_TABLEBITS,
                            this._state.LENGTH_len,
                            this._state.LENGTH_table
                        );
                        break;

                    case LzxConstants.BLOCKTYPE.UNCOMPRESSED:
                        bitbuf.EnsureBits(16); // get pu to 16 pad bits into the buffer
                        if (bitbuff.bits_left > 16)
                            bitbuf.inpos -= 2; // and align the bitstream!
                        R0 = bitbuf.ReadDword();
                        R1 = bitbuf.ReadDword();
                        R2 = bitbuf.ReadDword();
                        break;

                    default:
                        throw new Error('DECR_ILLEGALDATA');
                }
            }

            // buffer exhaustion check
            if (bitbuf.inpos > inLen) {
                /**
                 * it's possible to have a file where the next run is less than
                 * 16 bits in size. In this case, the READ_HUFFSYM() macro used
                 * in building the tables will exhaust the buffer, so we should
                 * allow for this, bu now allow those accidentially read bits to
                 * be used (so we check that there are at least 16 bits
                 * remaining - in this boundary case they aren't really part of
                 * the compressed data)
                 */
                if (bitbuf.inpos > (inLen + 2) || bitbuf.bits_left < 16)
                    throw new Error('DECR_ILLEGALDATA');
            }

            while ((this_run = this._state.block_remaining) > 0 && togo > 0) {
                if (this_run > togo)
                    this_run = togo;
                togo -= this_run;
                this._state.block_remaining -= this_run;

                // apply 2^x-1 mask
                window_posn &= window_size - 1;
                // runs can't straddle the window wraparound
                if ((window_posn + this_run) > window_size)
                    throw new Error('DECR_DATAFORMAT');

                switch (this._state.block_type) {
                    case LzxConstants.BLOCKTYPE.VERBATIM:
                        while (this_run > 0) {
                            main_element = this._ReadHuffSym(
                                this._state.MAINTREE_table,
                                this._state.MAINTREE_len,
                                LzxConstants.MAINTREE_MAXSYMBOLS,
                                LzxConstants.MAINTREE_TABLEBITS,
                                bitbuf
                            );
                            if (main_element < LzxConstants.NUM_CHAR) {
                                // literal: 0 to NUM_CARS - 1
                                window[window_posn++] = main_element;
                                this_run--;
                            }
                            else {
                                // match: NUM_CHARS + ((slot << 3) | length_header (3 bits))
                                main_element -= LzxConstants.NUM_CHARS;

                                match_length = main_element & LzxConstants.NUM_PRIMARY_LENGTHS;
                                if (match_length == LzxConstants.NUM_PRIMARY_LENGTHS) {
                                    length_footer = this._ReadHuffSym(this._state.LENGTH_table, this._state.LENGTH_len, LzxConstants.LENGTH_MAXSYMBOLS, LzxConstants.LENGTH_TABLEBITS, bitbuf);
                                    match_length += length_footer;
                                }
                                match_length += LzxConstants.MIN_MATCH;

                                match_offset = main_element >> 3;

                                if (match_offset > 2) {
                                    // not repeated offset
                                    if (mach_offset != 3) {
                                        extra = extra_bits[match_offset];
                                        verbatim_bits = bitbuf.ReadBits(extra);
                                        match_offset = position_base[match_offset] - 2 + verbatim_bits;
                                    }
                                    else
                                        match_offset = 1;

                                    // update repeated offset LRU queue
                                    R2 = R1;
                                    R1 = R0;
                                    R0 = match_offset;
                                }
                                else if (match_offset == 0)
                                    match_offset = R0;
                                else if (match_offset == 1) {
                                    match_offset = R1;
                                    R1 = R0;
                                    R0 = match_offset;
                                }
                                else { // match_offset == 2
                                    match_offset = R2;
                                    R2 = R0;
                                    R0 = match_offset;
                                }

                                rundest = window_posn;
                                this_run -= match_length;

                                // copy any wrapped around source data
                                if (window_posn >= match_offset)
                                    runsrc = rundest - match_offset; // no wrap
                                else {
                                    runsrc = rundest + window_size - match_offset
                                    copy_length = match_offset - window_posn;
                                    if (copy_length < match_length) {
                                        match_length -= copy_length;
                                        window_posn += copy_length;
                                        while (copy_length-- > 0)
                                            window[rundest++] = window[runsrc++];
                                        runsrc =0;
                                    }
                                }
                                window_posn += match_length;

                                // copy match data - no worries about destination wraps
                                while (match_length-- > 0)
                                    window[rundest++] = window[runsrc++];
                            }
                        }
                        break;

                    case LzxConstants.BLOCKTYPE.ALIGNED:
                        while (this_run > 0) {
                            main_element = this._ReadHuffSym(
                                this._state.MAINTREE_table,
                                this._state.MAINTREE_len,
                                LzxConstants.MAINTREE_MAXSYMBOLS,
                                LzxConstants.MAINTREE_TABLEBITS,
                                bitbuf
                            );

                            if (main_element < LzxConstants.NUM_CHAR) {
                                // literal: 0 to NUM_CARS - 1
                                window[window_posn++] = main_element;
                                this_run--;
                            }
                            else {
                                // match: NUM_CHARS + ((slot << 3) | length_header (3 bits))
                                main_element -= LzxConstants.NUM_CHARS;

                                match_length = main_element & LzxConstants.NUM_PRIMARY_LENGTHS;
                                if (match_length == LzxConstants.NUM_PRIMARY_LENGTHS) {
                                    length_footer = this._ReadHuffSym(
                                        this._state.LENGTH_table,
                                        this._state.LENGTH_len,
                                        LzxConstants.LENGTH_MAXSYMBOLS,
                                        LzxConstants.LENGTH_TABLEBITS,
                                        bitbuf
                                    );
                                    match_length += length_footer;
                                }
                                match_length += LzxConstants.MIN_MATCH;

                                match_offset = main_element >> 3;

                                if (match_offset > 2) {
                                    // not repeated offset
                                    extra = extra_bits[match_offset];
                                    match_offset = position_base[match_offset] - 2;

                                    if (extra > 3) {
                                        // verbatim and aligned bits
                                        extra -= 3;
                                        verbatim_bits = bitbuf.ReadBits(extra);
                                        match_offset += verbatim_bits << 3;
                                        aligned_bits = this._ReadHuffSym(
                                            this._state.ALIGNED_table,
                                            this._state.ALIGNED_len,
                                            LzxConstants.ALIGNED_MAXSYMBOLS,
                                            LzxConstants.ALIGNED_TABLEBITS,
                                            bitbuf
                                        );
                                        match_offset += aligned_bits;
                                    }
                                    else if (extra == 3) {
                                        // aligned bits only
                                        verbatim_bits = bitbuf.ReadBits(extra);
                                        match_offset += verbatim_bits << 3;
                                        aligned_bits = this._ReadHuffSym(
                                            this._state.ALIGNED_table,
                                            this._state.ALIGNED_len,
                                            LzxConstants.ALIGNED_MAXSYMBOLS,
                                            LzxConstants.ALIGNED_TABLEBITS,
                                            bitbuf
                                        );
                                        match_offset += aligned_bits;
                                    }
                                    else if (extra > 0) { // extra == 1, extra == 2
                                        // verbatim bits only
                                        verbatim_bits = bitbuf.ReadBits(extra);
                                        match_offset += verbatim_bits;
                                    }
                                    else { // extra == 0
                                        // ???
                                        match_offset = 1;
                                    }

                                    // update repeated offset LRU queue
                                    R2 = R1;
                                    R1 = R0;
                                    R0 = match_offset;
                                }
                                else if (match_offset == 0)
                                    match_offset = R0;
                                else if (match_offset == 1) {
                                    match_offset = R1;
                                    R1 = R0;
                                    R0 = match_offset;
                                }
                                else { // match_offset == 2
                                    match_offset = R2;
                                    R2 = R0;
                                    R0 = match_offset;
                                }

                                rundest = window_posn;
                                this_run -= match_length;

                                // copy any wrapped around source data
                                if (window_posn >= match_offset)
                                    runsrc = rundest - match_offset; // no wrap
                                else {
                                    runsrc = rundest + window_size - match_offset
                                    copy_length = match_offset - window_posn;
                                    if (copy_length < match_length) {
                                        match_length -= copy_length;
                                        window_posn += copy_length;
                                        while (copy_length-- > 0)
                                            window[rundest++] = window[runsrc++];
                                        runsrc =0;
                                    }
                                }
                                window_posn += match_length;

                                // copy match data - no worries about destination wraps
                                while (match_length-- > 0)
                                    window[rundest++] = window[runsrc++];
                            }
                        }
                        break;

                    case LzxConstants.BLOCKTYPE.UNCOMPRESSED:
                        if ((bitbuf.inpos + this_run) > inLen)
                            throw new Error('DECR_ILLEGALDATA');
                        // TODO: Array.Copy
                        bitbuf.inpos += this_run;
                        window_posn += this_run;
                        break;

                    default:
                        throw new Error('DECR_ILLEGALDATA');
                }
            }
        }

        if (togo != 0)
            throw new Error('DECR_ILLEGALDATA');

        let start_window_pos = window_posn;
        if (start_window_pos == 0)
            start_window_pos = window_size;
        start_window_pos -= outLen;
        // TODO: Array.Copy

        this._state.window_posn = window_posn;
        this._state.R0 = R0;
        this._state.R1 = R1;
        this._state.R2 = R2;
    }

    /**
     * @param {Number} nsyms
     * @param {Number} nbits
     * @param {Number[]} length
     * @param {Number[]} table
     * @returns {Number}
     */
    static _MakeDecodeTable(nsyms, nbits, length, table) {
        let sym;
        let leaf;
        let bit_num = 1;
        let fill;
        let pos = 0; // the current position in the decode table
        let table_mask = 1 << nbits;
        let bit_mask = table_mask >> 1; // don't do 0 length codes
        let next_symbol = bit_mask; // base of allocation for long codes

        // fill entries for codes short enough for a direct mapping
        while (bit_num <= nbits) {
            for (sym = 0; sym < nsyms; sym++) {
                if (length[sym] == bit_num) {
                    leaf = pos;
                    if ((pos += bit_mask) > table_mask)
                        return 1; // table overrun
                    // fill all possible lookups of this symbol with the symbol itself
                    fill = bit_mask;
                    while (fill-- > 0)
                        table[leaf++] = sym;
                }
            }
            bit_mask = bit_mask >> 1;
            bit_num++;
        }

        // if there are any codes longer than nbits
        if (pos != table_mask) {
            // clear the remainder of the table
            for (sym = pos; sym < table_mask; sym++)
                table[sym] = 0;

            // give ourselves room for codes to grow by up to 16 more bits
            pos = pos << 16;
            table_mask = table_mask << 16;
            bit_mask = 1 << 15;

            while (bit_num <= 16) {
                for (sym = 0; sym < nsyms; sym++) {
                    if (length[sym] == bit_num) {
                        leaf = pos >> 17;
                        for (fill = 0; fill < bit_num - nbits; fill++) {
                            // if this path hasn't been taken yet, 'allocate' wo entries
                            if (table[leaf] == 0) {
                                table[(next_symbol << 1)] = 0;
                                table[(next_symbol << 1) + 1] = 0;
                                table[leaf] = next_symbol++;
                            }
                            // follow the path and select either left or right for next bit
                            leaf = table[leaf] < 1;
                            if (((pos >> (15 - fill)) & 1) == 1)
                                leaf++;
                        }
                        table[leaf] = sym;

                        if ((pos += bit_mask) > table_mask)
                            return 1;
                    }
                }
                bit_mask = bit_mask >> 1;
                bit_num++;
            }
        }

        // full table?
        if (pos == table_mask)
            return 0;

        // either erroneous table, or all elements are 0 - let's find out.
        for (sym = 0; sym < nsyms; sym++)
            if (length[sym] != 0)
                return 1;
        return 0;
    }

    /**
     * @param {Number[]} lens
     * @param {Number} first
     * @param {Number} last
     * @param {BitBuffer} bitbuf
     */
    _ReadLengths(lens, first, last, bitbuf) {
        let x;
        let y;
        let z;

        // hufftbl pointer here?

        for (x = 0; x < 20; x++) {
            y = bitbuf.ReadBits(4);
            this._state.PREETREE_len[x] = y;
        }
        this._MakeDecodeTable(
            LzxConstants.PREETREE_MAXSYMBOLS,
            LzxConstants.PREETREE_TABLEBITS,
            this._state.PREETREE_len,
            this._state.PREETREE_table
        );

        for (x = first; x < last;) {
            z = this._ReadHuffSym(
                this._state.PREETREE_table,
                this._state.PREETREE_len,
                LzxConstants.PREETREE_MAXSYMBOLS,
                LzxConstants.PREETREE_TABLEBITS,
                bitbuf
            );
            if (z == 17) {
                y = bitbuf.ReadBits(4);
                y += 4;
                while (y-- != 0)
                    lens[x++] = 0;
            }
            else if (z == 18) {
                y = bitbuf.ReadBits(5);
                y += 20;
                while (y-- != 0)
                    lens[x++] = 0;
            }
            else if (z == 19) {
                y = bitbuf.ReadBits(1);
                y += 4;
                z = this._ReadHuffSym(
                    this._state.PREETREE_table,
                    this._state.PREETREE_len,
                    LzxConstants.PREETREE_MAXSYMBOLS,
                    LzxConstants.PREETREE_TABLEBITS,
                    bitbuf
                );
                z = lens[x] - z;
                if (z < 0)
                    z += 17;
                while (y-- != 0)
                    lens[x++] = z;
            }
            else {
                z = lens[x] - z;
                if (z < 0)
                    z += 17;
                lens[x++] = z;
            }
        }
    }

    /**
     * @param {Number[]} table
     * @param {Number[]} lengths
     * @param {Number} nsyms
     * @param {Number} nbits
     * @param {BitBuffer} bitbuf
     * @returns {Number}
     */
    static _ReadHuffSym(table, lengths, nsyms, nbits, bitbuf) {
        let i;
        let j;
        bitbuf.EnsureBits(16);
        if ((i = table[bitbuf.PeekBits(nbits)]) >= nsyms) {
            j = (1 << ((4 * 8) - 1));
            do {
                j = j >> 1;
                i = i << 1;
                i |= (bitbuf.bit_buffer & j) != 0 ? 1 : 0;
                if (j == 0)
                    return 0;
            }
            while ((i == table[i]) >= nsyms);
        }
        j = lengths[i];
        bitbuf.RemoveBits(j);

        return i;
    }
}

class BitBuffer {
    /**
     * @param {Number[]} inBuf
     * @param {Number} inlen
     */
    constructor(inBuf, inlen) {
        this.inBuf = inBuf;
        this.inlen = inlen;
        this.bit_buffer = 0;
        this.bits_left = 0;
        this.inpos = 0;
    }

    /**
     * @param {Number} bits
     */
    EnsureBits(bits) {
        while (bits_left < bits) {
            let lo = this.ReadByte();
            let hi = this.ReadByte();
            this.bit_buffer |= (((hi << 8) | lo) << (4 * 8 - 16 - this.bits_left));
            this.bits_left += 16;
        }
    }

    /**
     * @param {Number} bits
     */
    PeekBits(bits) {
        return (this.bit_buffer >> ((4 * 8) - bits));
    }

    /**
     * @param {Number} bits
     */
    RemoveBits(bits) {
        this.bit_buffer = this.bit_buffer << bits;
        this.bits_left -= bits;
    }

    /**
     * @param {Number} bits
     */
    ReadBits(bits) {
        let ret = 0;

        if (bits > 0) {
            EnsureBits(bits);
            ret = PeekBits(bits);
            RemoveBits(bits);
        }

        return ret;
    }

    ReadByte() {
        let ret = 0;
        if (this.inpos < this.inlen)
            ret = this.inBuf[this.inpos++];
        return ret;
    }

    ReadDWord() {
        let lo = this.ReadByte();
        let ml = this.ReadByte();
        let mh = this.ReadByte();
        let hi = this.ReadByte();
        return (hi << 24 | mh << 16 | ml << 8 | lo);
    }
}

const ArrayCopy = (sourceArray, sourceIndex, destinationArray, destinationIndex, length) => {
    for (let i = 0; i < length; i++)
        destinationArray[destinationIndex + i] = sourceArray[sourceIndex + i];
    return destinationArray;
}

class LzxState {
    constructor() {
        // for the LRU offset system
        this.R0 = 0;
        this.R1 = 0;
        this.R2 = 0;
        // number of main tree elements
        this.main_elements = 0;
        // have we started decoding at all yet?
        this.header_read = false;
        // type of this block
        this.block_type = 1;
        // uncompressed length of this block
        this.block_length = 0;
        // uncompressed bytes still left to decode
        this.block_remaining = 0;

        this.PREETREE_table = [];
        this.PREETREE_len = [];
        this.MAINTREE_table = [];
        this.MAINTREE_len = [];
        this.LENGTH_table = [];
        this.LENGTH_len = [];
        this.ALIGNED_table = [];
        this.ALIGNED_len = [];

        this.window = [];
        this.window_size = 0;
        this.window_posn = 0;
    }
}

const LzxConstants = {
    MIN_MATCH: 2,
    MAX_MATCH: 257,
    NUM_CHARS: 256,
    BLOCKTYPE: {
        INVALID: 0,
        VERBATIM: 1,
        ALIGNED: 2,
        UNCOMPRESSED: 3
    },
    PRETREE_NUM_ELEMENTS: 20,
    ALIGNED_NUM_ELEMENTS: 8,
    NUM_PRIMARY_LENGTHS: 7,
    NUM_SECONDARY_LENGTHS: 249,

    PRETREE_MAXSYMBOLS: 20,
    PRETREE_TABLEBITS: 6,
    MAINTREE_MAXSYMBOLS: 256 + 50 * 8,
    MAINTREE_TABLEBITS: 12,
    LENGTH_MAXSYMBOLS: 249 + 1,
    LENGTH_TABLEBITS: 12,
    ALIGNED_MAXSYMBOLS: 8,
    ALIGNED_TABLEBITS: 7,

    LENTABLE_SAFETY: 64
}

module.exports = LzxDecoder;
