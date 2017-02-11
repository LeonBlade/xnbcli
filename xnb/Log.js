const chalk = require('chalk');

const LOG_DEBUG = 0b0001;
const LOG_INFO = 0b0010;
const LOG_WARN = 0b0100;
const LOG_ERROR = 0b1000;

let _info = true, _warn = true, _error = true, _debug = false;

/**
 * Log class with static members to log messages to the console.
 * @class
 * @static
 */
class Log {

    static get DEBUG()  { return LOG_DEBUG; }
    static get INFO()   { return LOG_INFO; }
    static get WARN()   { return LOG_WARN; }
    static get ERROR()  { return LOG_ERROR; }

    /**
     * Sets the debug mode setting.
     * @public
     * @method setMode
     * @param {Number} log
     * @param {Boolean} state
     */
    static setMode(log, state) {
        if (log & LOG_DEBUG)
            _debug = state;
        if (log & LOG_INFO)
            _info = state;
        if (log & LOG_WARN)
            _warn = state;
        if (log & LOG_ERROR)
            _error = state;
    }

    /**
     * Displays an info message
     * @param {String} message Message to display to the console as info.
     */
    static info(message = '') {
        if (_info)
            console.log(chalk.bold.blue('[INFO] ') + message);
    }

    /**
     * Displays a debug message
     * @param {String} message Message to display to the console if debug is enabled.
     */
    static debug(message = '') {
        if (_debug)
            console.log(chalk.bold.green('[DEBUG] ') + message);
    }

    /**
     * Displays a warning message
     * @param {String} message Message to display to the console as a warning.
     */
    static warn(message = '') {
        if (_warn)
            console.log(chalk.bold.yellow('[WARN] ') + message);
    }

    /**
     * Displays an error message
     * @param {String} message Message to display to the console as an error.
     */
    static error(message = '') {
        if (_error)
            console.log(chalk.bold.red('[ERROR] ') + message);
    }

    /**
     * Displays a binary message
     * @param {Number} n
     * @param {Number} size
     * @param {Number} sliceBegin
     * @param {Number} sliceEnd
     */
    static b(n, size = 8, sliceBegin = -1, sliceEnd = -1) {
        var z = ''
        while (z.length < size)
            z += '0';
        z = z.slice(n.toString(2).length) + n.toString(2);
        if (sliceBegin == -1 && sliceEnd == -1)
            return `0b${z}`;
        return  chalk.gray('0b') +
                chalk.gray(z.slice(0, sliceBegin)) +
                chalk.bold.blue('[') + chalk.bold(z.slice(sliceBegin, sliceEnd)) + chalk.bold.blue(']') +
                chalk.gray(z.slice(sliceEnd));
    }
}

// export the log
module.exports = Log;
