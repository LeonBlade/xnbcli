const chalk = require('chalk');

/**
 * Log class with static members to log messages to the console.
 */
class Log {

    /**
     * Constructor for Log class.
     * @constructor
     * @param {Boolean} [debug] True if you want to print debug information.
     */
    constructor(debug = false) {
        this._debug = debug;
    }

    /**
     * Sets the debug mode setting.
     * @method debug
     * @param  {Boolean} mode State of displaying debug logs in the console.
     */
    static set DEBUG(mode) {
        this._debug = mode;
    }

    /**
     * Displays an info message
     * @param {String} message Message to display to the console as info.
     */
    static info(message) {
        console.log(chalk.bold.blue('[INFO] ') + message);
    }

    /**
     * Displays a debug message
     * @param {String} message Message to display to the console if debug is enabled.
     */
    static debug(message) {
        if (this._debug)
            console.log(chalk.bold.green('[DEBUG] ') + message);
    }

    /**
     * Displays a warning message
     * @param {String} message Message to display to the console as a warning.
     */
    static warn(message) {
        console.log(chalk.bold.yellow('[WARN] ') + message);
    }

    /**
     * Displays an error message
     * @param {String} message Message to display to the console as an error.
     */
    static error(message) {
        console.log(chalk.bold.red('[ERROR] ') + message);
    }
}

// export the log
module.exports = Log;
