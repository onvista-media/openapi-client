"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParamName = exports.renderParamSignature = exports.renderOperationGroup = exports.genOperationGroupFiles = void 0;
const util_1 = require("../util");
const support_1 = require("./support");
function genOperations(spec, operations, options) {
    const files = genOperationGroupFiles(spec, operations, options);
    files.forEach((file) => (0, util_1.writeFileSync)(file.path, file.contents));
}
exports.default = genOperations;
// OW: Current wip
function genOperationGroupFiles(spec, operations, options) {
    operations.forEach((op, index) => {
        if (op.responses) {
            (0, util_1.writeFileSync)("./output/resp.json", JSON.stringify(operations[index].responses));
            operations[index].responses = operations[index].responses.map((res) => {
                var _a, _b;
                //@ts-ignore
                if ((_b = (_a = res === null || res === void 0 ? void 0 : res.content) === null || _a === void 0 ? void 0 : _a["application/json"]) === null || _b === void 0 ? void 0 : _b.schema) {
                    //@ts-ignore
                    // console.log({ schema: res.content["application/json"].schema });
                    return Object.assign(Object.assign({}, res), { 
                        //@ts-ignore
                        schema: res.content["application/json"].schema });
                }
                return res;
            });
        }
        if (op.requestBody) {
            operations[index].parameters.push(
            // @ts-ignore
            {
                in: "body",
                name: "body",
                required: false,
                //@ts-ignore
                schema: operations[index].requestBody.content["application/json"],
            });
        }
    });
    const groups = (0, util_1.groupOperationsByGroupName)(operations);
    const files = [];
    for (let name in groups) {
        const group = groups[name];
        const lines = [];
        (0, util_1.join)(lines, renderHeader(name, spec, options));
        (0, util_1.join)(lines, renderOperationGroup(group, renderOperation, spec, options));
        if (options.language === "ts") {
            (0, util_1.join)(lines, renderOperationGroup(group, renderOperationParamType, spec, options));
        }
        (0, util_1.join)(lines, renderOperationGroup(group, renderOperationInfo, spec, options));
        files.push({
            path: `${options.outDir}/${name}.${options.language}`,
            contents: lines.join("\n"),
        });
    }
    return files;
}
exports.genOperationGroupFiles = genOperationGroupFiles;
function renderHeader(name, spec, options) {
    const lines = [];
    if (spec.definitions && options.language === "ts") {
        lines.push(`/// <reference path="types.ts"/>`);
    }
    lines.push(`/** @module ${name} */`);
    lines.push(`// Auto-generated, edits will be overwritten`);
    lines.push(`import * as gateway from './gateway'${support_1.ST}`);
    lines.push("");
    return lines;
}
function renderOperationGroup(group, func, spec, options) {
    return group
        .map((op) => func.call(this, spec, op, options))
        .reduce((a, b) => a.concat(b));
}
exports.renderOperationGroup = renderOperationGroup;
function renderOperation(spec, op, options) {
    const lines = [];
    (0, util_1.join)(lines, renderOperationDocs(op));
    (0, util_1.join)(lines, renderOperationBlock(spec, op, options));
    return lines;
}
function renderOperationDocs(op) {
    const lines = [];
    lines.push(`/**`);
    (0, util_1.join)(lines, renderDocDescription(op));
    (0, util_1.join)(lines, renderDocParams(op));
    lines.push(` */`);
    return lines;
}
function renderDocDescription(op) {
    const desc = op.description || op.summary;
    return desc
        ? `${support_1.DOC}${desc.trim()}`
            .replace(/\/\*/g, "/ *")
            .replace(/\*\//g, "* /")
            .replace(/\n/g, `\n${support_1.DOC}`)
            .split("\n")
        : [];
}
function renderDocParams(op) {
    const params = op.parameters;
    if (!params.length)
        return [];
    const required = params.filter((param) => param.required);
    const optional = params.filter((param) => !param.required);
    const lines = [];
    (0, util_1.join)(lines, required.map(renderDocParam));
    if (optional.length) {
        lines.push(`${support_1.DOC}@param {object} options Optional options`);
        (0, util_1.join)(lines, optional.map(renderDocParam));
    }
    if (op.description || op.summary) {
        lines.unshift(support_1.DOC);
    }
    lines.push(renderDocReturn(op));
    return lines;
}
function renderDocParam(param) {
    let name = getParamName(param.name);
    let description = (param.description || "")
        .trim()
        .replace(/\n/g, `\n${support_1.DOC}${support_1.SP}`);
    if (!param.required) {
        name = `options.${name}`;
        if (param.default)
            name += `=${param.default}`;
        name = `[${name}]`;
    }
    if (param.enum && param.enum.length) {
        description = `Enum: ${param.enum.join(", ")}. ${description}`;
    }
    return `${support_1.DOC}@param {${(0, support_1.getDocType)(param)}} ${name} ${description}`;
}
function renderDocReturn(op) {
    const response = (0, util_1.getBestResponse)(op);
    let description = response ? response.description || "" : "";
    description = description.trim().replace(/\n/g, `\n${support_1.DOC}${support_1.SP}`);
    return `${support_1.DOC}@return {Promise<${(0, support_1.getDocType)(response)}>} ${description}`;
}
function renderOperationBlock(spec, op, options) {
    const lines = [];
    (0, util_1.join)(lines, renderOperationSignature(op, options));
    (0, util_1.join)(lines, renderOperationObject(spec, op, options));
    (0, util_1.join)(lines, renderRequestCall(op, options));
    lines.push("");
    return lines;
}
function renderOperationSignature(op, options) {
    const paramSignature = renderParamSignature(op, options);
    const rtnSignature = renderReturnSignature(op, options);
    return [`export function ${op.id}(${paramSignature})${rtnSignature} {`];
}
function renderParamSignature(op, options, pkg) {
    const params = op.parameters;
    const required = params.filter((param) => param.required);
    const optional = params.filter((param) => !param.required);
    const funcParams = renderRequiredParamsSignature(required, options);
    const optParam = renderOptionalParamsSignature(op, optional, options, pkg);
    if (optParam.length)
        funcParams.push(optParam);
    return funcParams.map((p) => p.join(": ")).join(", ");
}
exports.renderParamSignature = renderParamSignature;
function renderRequiredParamsSignature(required, options) {
    return required.reduce((a, param) => {
        a.push(getParamSignature(param, options));
        return a;
    }, []);
}
function renderOptionalParamsSignature(op, optional, options, pkg) {
    if (!optional.length)
        return [];
    if (!pkg)
        pkg = "";
    const s = options.language === "ts" ? "?" : "";
    const param = [`options${s}`];
    if (options.language === "ts")
        param.push(`${pkg}${op.id[0].toUpperCase() + op.id.slice(1)}Options`);
    return param;
}
function renderReturnSignature(op, options) {
    if (options.language !== "ts")
        return "";
    const response = (0, util_1.getBestResponse)(op);
    (0, util_1.writeFileSync)("./output/test.json", JSON.stringify({ response, op, options }, null, 4));
    // console.log({
    //   response,
    //   op,
    // });
    return `: Promise<api.Response<${(0, support_1.getTSParamType)(Object.assign(Object.assign({}, response), { $ref: "#/components/schemas/UserIdentifier" }))}>>`;
}
function getParamSignature(param, options) {
    const signature = [getParamName(param.name)];
    if (options.language === "ts")
        signature.push((0, support_1.getTSParamType)(param));
    return signature;
}
function getParamName(name) {
    const parts = name.split(/[_-\s!@\#$%^&*\(\)]/g).filter((n) => !!n);
    const reduced = parts.reduce((name, p) => `${name}${p[0].toUpperCase()}${p.slice(1)}`);
    return escapeReservedWords(reduced);
}
exports.getParamName = getParamName;
function escapeReservedWords(name) {
    let escapedName = name;
    const reservedWords = [
        "break",
        "case",
        "catch",
        "class",
        "const",
        "continue",
        "debugger",
        "default",
        "delete",
        "do",
        "else",
        "export",
        "extends",
        "finally",
        "for",
        "function",
        "if",
        "import",
        "in",
        "instanceof",
        "new",
        "return",
        "super",
        "switch",
        "this",
        "throw",
        "try",
        "typeof",
        "var",
        "void",
        "while",
        "with",
        "yield",
    ];
    if (reservedWords.indexOf(name) >= 0) {
        escapedName = name + "_";
    }
    return escapedName;
}
function renderOperationObject(spec, op, options) {
    const lines = [];
    const parameters = op.parameters.reduce(groupParams, {});
    const names = Object.keys(parameters);
    const last = names.length - 1;
    names.forEach((name, i) => {
        (0, util_1.join)(lines, renderParamGroup(name, parameters[name], i === last));
    });
    if (lines.length) {
        if (options.language === "ts") {
            lines.unshift(`${support_1.SP}const parameters: api.OperationParamGroups = {`);
        }
        else {
            lines.unshift(`${support_1.SP}const parameters = {`);
        }
        lines.push(`${support_1.SP}}${support_1.ST}`);
        const hasOptionals = op.parameters.some((op) => !op.required);
        if (hasOptionals)
            lines.unshift(`${support_1.SP}if (!options) options = {}${support_1.ST}`);
    }
    return lines;
}
function groupParams(groups, param) {
    const group = groups[param.in] || [];
    const name = getParamName(param.name);
    const realName = /^[_$a-z0-9]+$/gim.test(param.name)
        ? param.name
        : `'${param.name}'`;
    const value = param.required ? name : "options." + name;
    if (param.type === "array") {
        if (!param.collectionFormat)
            throw new Error(`param ${param.name} must specify an array collectionFormat`);
        const str = `gateway.formatArrayParam(${value}, '${param.collectionFormat}', '${param.name}')`;
        group.push(`${support_1.SP.repeat(3)}${realName}: ${str}`);
    }
    else if (param.format === "date" || param.format === "date-time") {
        const str = `gateway.formatDate(${value}, '${param.format}')`;
        group.push(`${support_1.SP.repeat(3)}${realName}: ${str}`);
    }
    else if (param.required && param.name === name && name === realName) {
        group.push(`${support_1.SP.repeat(3)}${realName}`);
    }
    else {
        group.push(`${support_1.SP.repeat(3)}${realName}: ${value}`);
    }
    groups[param.in] = group;
    return groups;
}
function renderParamGroup(name, groupLines, last) {
    const lines = [];
    lines.push(`${support_1.SP.repeat(2)}${name}: {`);
    (0, util_1.join)(lines, groupLines.join(",\n").split("\n"));
    lines.push(`${support_1.SP.repeat(2)}}${last ? "" : ","}`);
    return lines;
}
function renderRequestCall(op, options) {
    const params = op.parameters.length ? ", parameters" : "";
    return [`${support_1.SP}return gateway.request(${op.id}Operation${params})${support_1.ST}`, "}"];
}
function renderOperationParamType(spec, op, options) {
    const optional = op.parameters.filter((param) => !param.required);
    if (!optional.length)
        return [];
    const lines = [];
    lines.push(`export interface ${op.id[0].toUpperCase() + op.id.slice(1)}Options {`);
    optional.forEach((param) => {
        if (param.description) {
            lines.push(`${support_1.SP}/**`);
            lines.push(`${support_1.SP}${support_1.DOC}` +
                (param.description || "").trim().replace(/\n/g, `\n${support_1.SP}${support_1.DOC}${support_1.SP}`));
            lines.push(`${support_1.SP} */`);
        }
        lines.push(`${support_1.SP}${getParamName(param.name)}?: ${(0, support_1.getTSParamType)(param)}${support_1.ST}`);
    });
    lines.push("}");
    lines.push("");
    return lines;
}
// We could just JSON.stringify this stuff but want it looking as if typed by developer
function renderOperationInfo(spec, op, options) {
    const lines = [];
    if (options.language === "ts") {
        lines.push(`const ${op.id}Operation: api.OperationInfo = {`);
    }
    else {
        lines.push(`const ${op.id}Operation = {`);
    }
    lines.push(`${support_1.SP}path: '${op.path}',`);
    const hasBody = op.requestBody;
    if (hasBody && op.contentTypes.length) {
        lines.push(`${support_1.SP}contentTypes: ['${op.contentTypes.join("','")}'],`);
    }
    lines.push(`${support_1.SP}method: '${op.method}'${op.security ? "," : ""}`);
    if (op.security && op.security.length) {
        const secLines = renderSecurityInfo(op.security);
        lines.push(`${support_1.SP}security: [`);
        (0, util_1.join)(lines, secLines);
        lines.push(`${support_1.SP}]`);
    }
    lines.push(`}${support_1.ST}`);
    lines.push("");
    return lines;
}
function renderSecurityInfo(security) {
    return security
        .map((sec, i) => {
        const scopes = sec.scopes;
        const secLines = [];
        secLines.push(`${support_1.SP.repeat(2)}{`);
        secLines.push(`${support_1.SP.repeat(3)}id: '${sec.id}'${scopes ? "," : ""}`);
        if (scopes) {
            secLines.push(`${support_1.SP.repeat(3)}scopes: ['${scopes.join(`', '`)}']`);
        }
        secLines.push(`${support_1.SP.repeat(2)}}${i + 1 < security.length ? "," : ""}`);
        return secLines;
    })
        .reduce((a, b) => a.concat(b));
}
