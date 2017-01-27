const chalk = require('chalk');

class XnbError extends Error {
    constructor(message = '') {
        super(message);
        this.name = chalk.bold.red('[ERROR] ') + this.constructor.name;
        this.message = message;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = XnbError;
