const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');
const Int32Reader = require('./Int32Reader');
const UInt32Reader = require('./UInt32Reader');
const dxt = require('dxt');
const Log = require('../Log');
const XnbError = require('../XnbError');

/**
 * Texture2D Reader
 * @class
 * @extends BaseReader
 */
class Texture2DReader extends BaseReader {
    /**
     * Reads Texture2D from buffer.
     * @param {BufferReader} buffer
     * @returns {object}
     */
    read(buffer) {
        const int32Reader = new Int32Reader();
        const uint32Reader = new UInt32Reader();

        let format = int32Reader.read(buffer);
        let width = uint32Reader.read(buffer);
        let height = uint32Reader.read(buffer);
        let mipCount = uint32Reader.read(buffer);

        if (mipCount > 1)
            Log.warn(`Found mipcount of ${mipCount}, only the first will be used.`);

        let dataSize = uint32Reader.read(buffer);
        let data = buffer.read(dataSize);

        if (format == 4)
            data = dxt.decompress(data, width, height, dxt.kDxt1);
        else if (format == 5)
            data = dxt.decompress(data, width, height, dxt.kDxt3);
        else if (format == 6)
            data = dxt.decompress(data, width, height, dxt.kDxt5);
        else if (format != 0)
            throw new XnbError(`Non-implemented Texture2D format type (${format}) found.`);

        // add the alpha channel into the image
        for(let i = 0; i < data.length; i += 4) {
            let inverseAlpha = 255 / data[i + 3];
            data[i    ] = Math.min(Math.ceil(data[i    ] * inverseAlpha), 255);
            data[i + 1] = Math.min(Math.ceil(data[i + 1] * inverseAlpha), 255);
            data[i + 2] = Math.min(Math.ceil(data[i + 2] * inverseAlpha), 255);
        }

        return {
            format,
            width,
            height,
            export: { type: this.type, data }
        };
    }

    isValueType() {
        return false;
    }
}

module.exports = Texture2DReader;
