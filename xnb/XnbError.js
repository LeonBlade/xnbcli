const chalk = require('chalk');

class XnbError extends Error {
    constructor(message = '') {
        super(message);
        this.name = chalk.bold.red('[EXCEPTION] ') + this.constructor.name;
        this.message = message;
        Error.captureStackTrace(this, XnbError);
    }
}

module.exports = XnbError;
