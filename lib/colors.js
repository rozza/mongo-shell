"use strict"

const chalk = require('chalk');
const hasAnsi = require('has-ansi');

class Palette {
    constructor() {
        this.string = chalk.green;
        this.number = chalk.yellow;
        this.boolean = chalk.blue;
        this.null = chalk.magenta;
        this.key = chalk.bold.green;
    }
}
const palette = new Palette();

function colorize(line) {
    if (typeof line != 'string') return line;
    if (!chalk.supportsColor || hasAnsi(line)) return line;

    let arr = [];

    line = line.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let style = palette.number;
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                style = palette.key;
            } else {
                style = palette.string;
            }
        } else if (/true|false/.test(match)) {
            style = palette.boolean;
        } else if (/null/.test(match)) {
            style = palette.null;
        }
        return style(match);
    });
    return line;
}


module.exports = {
  palette: palette,
  colorize: colorize,
}
