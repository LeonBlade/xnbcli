const chalk = require('chalk');

class XnbError extends Error {
    constructor(message = '') {
        super(message);
        this.name = this.constructor.name;
        this.message = message;
        Error.captureStackTrace(this, XnbError);
    }
}

module.exports = XnbError;
