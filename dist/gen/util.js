"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeOldFiles = exports.getBestResponse = exports.camelToUppercase = exports.join = exports.groupOperationsByGroupName = exports.writeFileSync = exports.exists = void 0;
const FS = require("fs");
const PATH = require("path");
const mkdirp = require("mkdirp");
function exists(filePath) {
    try {
        return FS.lstatSync(filePath);
    }
    catch (e) {
        return undefined;
    }
}
exports.exists = exists;
function writeFileSync(filePath, contents) {
    mkdirp.sync(PATH.dirname(filePath));
    FS.writeFileSync(filePath, contents);
}
exports.writeFileSync = writeFileSync;
function groupOperationsByGroupName(operations) {
    return operations.reduce((groups, op) => {
        if (!groups[op.group])
            groups[op.group] = [];
        groups[op.group].push(op);
        return groups;
    }, {});
}
exports.groupOperationsByGroupName = groupOperationsByGroupName;
function join(parent, child) {
    parent.push.apply(parent, child);
    return parent;
}
exports.join = join;
function camelToUppercase(value) {
    return value.replace(/([A-Z]+)/g, "_$1").toUpperCase();
}
exports.camelToUppercase = camelToUppercase;
function getBestResponse(op) {
    const NOT_FOUND = 100000;
    let lowestCode;
    for (let resp of op.responses) {
        if (resp.code === "default") {
            lowestCode = resp.code;
            break;
        }
        const responseCode = parseInt(resp.code);
        if (isNaN(responseCode) || responseCode >= parseInt(lowestCode)) {
            lowestCode = lowestCode;
        }
        else {
            lowestCode = `${responseCode}`;
        }
    }
    return lowestCode === `${NOT_FOUND}`
        ? op.responses[0]
        : op.responses.find((resp) => resp.code == `${lowestCode}`);
}
exports.getBestResponse = getBestResponse;
function removeOldFiles(options) {
    cleanDirs(options.outDir, options);
}
exports.removeOldFiles = removeOldFiles;
function cleanDirs(dir, options) {
    dir = PATH.resolve(dir);
    const stats = exists(dir);
    if (!stats || !stats.isDirectory())
        return;
    const files = FS.readdirSync(dir).map((file) => PATH.resolve(`${dir}/${file}`));
    while (files.length) {
        const file = files.pop();
        if (file.endsWith(options.language) &&
            !file.endsWith(`index.${options.language}`)) {
            FS.unlinkSync(file);
        }
        else if (exists(file).isDirectory()) {
            cleanDirs(file, options);
        }
    }
}
