"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genCode = void 0;
require("isomorphic-fetch");
const spec_1 = require("./spec");
const js_1 = require("./gen/js");
const util_1 = require("./gen/util");
const assert = require("assert");
const fs_1 = require("fs");
function genCode(options) {
    return verifyOptions(options).then((options) => (0, spec_1.resolveSpec)(options.src, { ignoreRefType: "#/definitions/" }).then((spec) => {
        console.log({ spec });
        (0, fs_1.writeFileSync)("./output/spec.json", JSON.stringify(spec, null, 2));
        return gen(spec, options);
    }));
}
exports.genCode = genCode;
function verifyOptions(options) {
    try {
        assert.ok(options.src, "Open API src not specified");
        assert.ok(options.outDir, "Output directory not specified");
        assert.ok(options.language, "Generation language not specified");
        return Promise.resolve(options);
    }
    catch (e) {
        return Promise.reject(e);
    }
}
function gen(spec, options) {
    (0, util_1.removeOldFiles)(options);
    const operations = (0, spec_1.getOperations)(spec);
    (0, fs_1.writeFileSync)("./output/operations.json", JSON.stringify(operations, null, 2));
    switch (options.language) {
        case "js":
            return (0, js_1.default)(spec, operations, options);
        case "ts":
            return (0, js_1.default)(spec, operations, options);
        default:
            throw new Error(`Language '${options.language}' not supported`);
    }
}
