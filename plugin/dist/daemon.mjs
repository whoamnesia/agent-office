import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// packages/daemon/src/main.ts
import crypto from "node:crypto";
import fs4 from "node:fs";
import http3 from "node:http";
import path4 from "node:path";
import { fileURLToPath } from "node:url";

// packages/daemon/src/config.ts
import fs from "node:fs";
import path from "node:path";
var DEFAULT_CONFIG = {
  autostart: true,
  port: 47821,
  showContent: false,
  hidePaths: false,
  dayCycleMinutes: 15,
  dayMode: "auto",
  timeOfDay: 0.45,
  weather: "auto",
  weatherFollowsHealth: true,
  sound: false,
  lang: "auto",
  quality: "auto",
  fpsCap: 60,
  reducedMotion: "auto",
  colorblind: false,
  uiScale: 1,
  seasonal: true,
  deptRules: null,
  relayUrl: null,
  relayToken: null,
  customization: {},
  layout: {}
};
var UI_WRITABLE = [
  "dayMode",
  "timeOfDay",
  "weather",
  "weatherFollowsHealth",
  "sound",
  "lang",
  "quality",
  "fpsCap",
  "reducedMotion",
  "colorblind",
  "uiScale",
  "seasonal",
  "customization",
  "layout",
  "dayCycleMinutes"
];
function readJson(file) {
  try {
    const v = JSON.parse(fs.readFileSync(file, "utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
function loadConfig(configFile, projectDir) {
  const user = readJson(configFile);
  const project = projectDir ? readJson(path.join(projectDir, ".claude", "agent-office.config.json")) : {};
  delete project.relayUrl;
  delete project.relayToken;
  return sanitize({ ...DEFAULT_CONFIG, ...user, ...project });
}
function sanitize(c) {
  const d = DEFAULT_CONFIG;
  const pick = (k, ok) => ok(c[k]) ? c[k] : d[k];
  const bool = (v) => typeof v === "boolean";
  const oneOf = (...xs) => (v) => xs.includes(v);
  const num = (lo, hi) => (v) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
  const obj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const strOrNull = (v) => v === null || typeof v === "string" && v.length < 2e3;
  return {
    autostart: pick("autostart", bool),
    port: pick("port", num(1024, 65535)),
    showContent: pick("showContent", bool),
    hidePaths: pick("hidePaths", bool),
    dayCycleMinutes: pick("dayCycleMinutes", num(1, 24 * 60)),
    dayMode: pick("dayMode", oneOf("auto", "day", "night", "manual")),
    timeOfDay: pick("timeOfDay", num(0, 1)),
    weather: pick("weather", oneOf("auto", "clear", "rain", "snow", "fog")),
    weatherFollowsHealth: pick("weatherFollowsHealth", bool),
    sound: pick("sound", bool),
    lang: pick("lang", oneOf("auto", "ru", "en")),
    quality: pick("quality", oneOf("auto", "high", "low")),
    fpsCap: pick("fpsCap", oneOf(60, 30, 15)),
    reducedMotion: pick("reducedMotion", oneOf("auto", "on", "off")),
    colorblind: pick("colorblind", bool),
    uiScale: pick("uiScale", num(0.75, 2)),
    seasonal: pick("seasonal", bool),
    deptRules: pick("deptRules", (v) => v === null || Array.isArray(v) && v.length < 200),
    relayUrl: pick("relayUrl", strOrNull),
    relayToken: pick("relayToken", strOrNull),
    customization: pick("customization", obj),
    layout: pick("layout", obj)
  };
}
function saveConfig(configFile, patch) {
  const current = readJson(configFile);
  const next = { ...current, ...patch };
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  const tmp = configFile + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, configFile);
  return sanitize({ ...DEFAULT_CONFIG, ...next });
}
function publicConfig(c) {
  const { relayToken: _t, deptRules: _r, ...rest } = c;
  return { ...rest, relayConfigured: !!(c.relayUrl && c.relayToken) };
}

// packages/protocol/src/constants.ts
var SCHEMA_VERSION = 1;
var SOURCES = ["local", "cloud", "demo", "replay"];
var AGENT_STATUSES = [
  "thinking",
  "reading",
  "writing",
  "running",
  "searching",
  "waiting_user",
  "error",
  "done",
  "idle"
];
var DEPARTMENTS = ["frontend", "backend", "qa", "devops", "docs", "research", "security", "general"];
var MAIN_AGENT_ID = "main";

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path5, errorMaps, issueData } = params;
  const fullPath = [...path5, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path5, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path5;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg2) => {
        addIssueToContext(ctx, arg2);
        if (arg2.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base2 = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base2))
          return INVALID;
        const result = effect.transform(base2.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base2) => {
          if (!isValid(base2))
            return INVALID;
          return Promise.resolve(effect.transform(base2.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg2) => ZodString.create({ ...arg2, coerce: true })),
  number: ((arg2) => ZodNumber.create({ ...arg2, coerce: true })),
  boolean: ((arg2) => ZodBoolean.create({
    ...arg2,
    coerce: true
  })),
  bigint: ((arg2) => ZodBigInt.create({ ...arg2, coerce: true })),
  date: ((arg2) => ZodDate.create({ ...arg2, coerce: true }))
};
var NEVER = INVALID;

// packages/protocol/src/schema.ts
var Source = external_exports.enum(SOURCES);
var AgentStatus = external_exports.enum(AGENT_STATUSES);
var Department = external_exports.enum(DEPARTMENTS);
var id = external_exports.string().min(1).max(200);
var shortText = external_exports.string().max(300);
var ProjectRef = external_exports.object({
  id,
  name: external_exports.string().max(120)
});
var base = {
  v: external_exports.literal(SCHEMA_VERSION),
  id,
  ts: external_exports.number().int().nonnegative(),
  source: Source,
  session_id: id,
  project: ProjectRef.optional()
};
var SessionStart = external_exports.object({
  ...base,
  type: external_exports.literal("session.start"),
  reason: external_exports.string().max(40).optional(),
  /** Local-only: transcript location, stripped before broadcasting. */
  transcript: external_exports.string().max(1e3).optional()
});
var SessionEnd = external_exports.object({ ...base, type: external_exports.literal("session.end"), reason: external_exports.string().max(40).optional() });
var AgentSpawn = external_exports.object({
  ...base,
  type: external_exports.literal("agent.spawn"),
  agent_id: id,
  agent_type: external_exports.string().max(80),
  parent_id: id.optional(),
  /** Short task label; only filled when showContent is on. */
  task: shortText.optional()
});
var AgentEnd = external_exports.object({
  ...base,
  type: external_exports.literal("agent.end"),
  agent_id: id,
  ok: external_exports.boolean().optional(),
  transcript: external_exports.string().max(1e3).optional()
});
var AgentStatusEvent = external_exports.object({
  ...base,
  type: external_exports.literal("agent.status"),
  agent_id: id,
  status: AgentStatus,
  /** Department hint derived from the tool target, so the worker can walk to the right room. */
  dept: Department.optional()
});
var ToolCall = external_exports.object({
  ...base,
  type: external_exports.literal("tool.call"),
  agent_id: id,
  tool_use_id: id.optional(),
  name: external_exports.string().max(120),
  target: shortText.optional(),
  dept: Department.optional()
});
var ToolResult = external_exports.object({
  ...base,
  type: external_exports.literal("tool.result"),
  agent_id: id,
  tool_use_id: id.optional(),
  name: external_exports.string().max(120),
  ok: external_exports.boolean(),
  duration_ms: external_exports.number().nonnegative().optional()
});
var TaskCreated = external_exports.object({
  ...base,
  type: external_exports.literal("task.created"),
  task_id: id,
  subject: shortText,
  agent_id: id.optional()
});
var TaskCompleted = external_exports.object({
  ...base,
  type: external_exports.literal("task.completed"),
  task_id: id,
  subject: shortText,
  agent_id: id.optional()
});
var Notify = external_exports.object({
  ...base,
  type: external_exports.literal("notify"),
  kind: external_exports.string().max(60),
  message: shortText.optional(),
  agent_id: id.optional()
});
var CostTick = external_exports.object({
  ...base,
  type: external_exports.literal("cost.tick"),
  agent_id: id.optional(),
  tokens: external_exports.number().nonnegative(),
  usd: external_exports.number().nonnegative().optional(),
  /** absolute = running total for the agent/session; delta = increment. */
  mode: external_exports.enum(["absolute", "delta"]).default("absolute")
});
var OfficeEvent = external_exports.discriminatedUnion("type", [
  SessionStart,
  SessionEnd,
  AgentSpawn,
  AgentEnd,
  AgentStatusEvent,
  ToolCall,
  ToolResult,
  TaskCreated,
  TaskCompleted,
  Notify,
  CostTick
]);
var EventBatch = external_exports.union([OfficeEvent, external_exports.array(OfficeEvent).max(500)]);
function validateEvents(body) {
  const items = Array.isArray(body) ? body.slice(0, 500) : [body];
  const ok = [];
  let rejected = 0;
  for (const item of items) {
    const r = OfficeEvent.safeParse(item);
    if (r.success) ok.push(r.data);
    else rejected++;
  }
  return { ok, rejected };
}
function stripLocalFields(e) {
  if ("transcript" in e && e.transcript !== void 0) {
    const { transcript: _t, ...rest } = e;
    return rest;
  }
  return e;
}

// packages/protocol/src/departments.ts
var cache = /* @__PURE__ */ new Map();
function globToRegExp(glob) {
  const hit = cache.get(glob);
  if (hit) return hit;
  let re = "";
  let inBraces = false;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (c === "{") {
      inBraces = true;
      re += "(?:";
    } else if (c === "}" && inBraces) {
      inBraces = false;
      re += ")";
    } else if (c === "," && inBraces) re += "|";
    else if (".+^$()|[]\\".includes(c)) re += "\\" + c;
    else re += c;
  }
  const out = new RegExp("^" + re + "$", "i");
  cache.set(glob, out);
  return out;
}
var DEFAULT_DEPT_RULES = [
  { dept: "security", glob: "**/{.env*,*secret*,*auth*,*crypt*,*permission*,security/**,auth/**,secrets/**,crypto/**}" },
  { dept: "qa", glob: "**/{*.test.*,*.spec.*,test/**,tests/**,__tests__/**,e2e/**,*_test.go,test_*.py}" },
  { dept: "qa", command: "\\b(vitest|jest|pytest|playwright|mocha|go test|cargo test|npm (run )?test|pnpm test|yarn test)\\b" },
  { dept: "devops", glob: "**/{Dockerfile,docker-compose*,*.tf,*.yml,*.yaml,.github/**,k8s/**,helm/**,Makefile,*.sh,wrangler.toml}" },
  { dept: "devops", command: "\\b(docker|kubectl|terraform|helm|ssh|systemctl|wrangler|gh|git push|npm (i|install|ci)|apt|brew)\\b" },
  { dept: "docs", glob: "**/{*.md,*.mdx,*.rst,*.txt,docs/**,LICENSE*}" },
  { dept: "frontend", glob: "**/{*.tsx,*.jsx,*.vue,*.svelte,*.css,*.scss,*.sass,*.less,*.html,components/**,web/**,ui/**,pages/**,app/**,public/**}" },
  { dept: "backend", glob: "**/{*.go,*.rs,*.py,*.java,*.kt,*.rb,*.php,*.sql,*.cs,server/**,api/**,db/**,daemon/**,migrations/**}" },
  { dept: "research", tool: "WebSearch" },
  { dept: "research", tool: "WebFetch" },
  { dept: "backend", glob: "**/*.{ts,js,mjs,cjs,json}" }
];
function classifyDept(input, rules = DEFAULT_DEPT_RULES) {
  for (const r of rules) {
    if (r.tool && r.tool === input.tool) return r.dept;
    if (r.glob && input.path && globToRegExp(r.glob).test(input.path)) return r.dept;
    if (r.command && input.command) {
      try {
        if (new RegExp(r.command, "i").test(input.command)) return r.dept;
      } catch {
      }
    }
  }
  return void 0;
}

// packages/protocol/src/privacy.ts
var SECRET_PATTERNS = [
  /--?(?:password|passwd|token|secret|api-key|apikey|key|auth)[= ]\S+/gi,
  /\bauthorization\s*[:=]\s*(?:(?:bearer|basic|token)\s+)?[^\s"']+/gi,
  /\b(?:bearer|token)\s+[^\s"']+/gi,
  /\b(sk|pk|rk|ghp|gho|ghs|github_pat|xox[abpr]|AKIA|AIza)[-_A-Za-z0-9]{8,}/g,
  /\b([A-Za-z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|PWD|CREDENTIALS?)[A-Za-z0-9_]*)\s*[=:]\s*\S+/gi,
  /\b[A-Za-z0-9+/_-]{40,}={0,2}/g,
  /:\/\/[^/\s:@]+:[^/\s@]+@/g
];
function maskSecrets(s) {
  let out = s;
  for (const re of SECRET_PATTERNS) out = out.replace(re, (m) => m.startsWith("://") ? "://***@" : "***");
  return out;
}
function truncate(s, max) {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? one.slice(0, max - 1) + "\u2026" : one;
}
function relativePath(p, root) {
  const norm = p.replace(/\\/g, "/");
  if (root) {
    const r = root.replace(/\\/g, "/").replace(/\/+$/, "");
    if (norm === r) return ".";
    if (norm.startsWith(r + "/")) return norm.slice(r.length + 1);
  }
  const parts = norm.split("/").filter(Boolean);
  return (parts.length > 2 ? "\u2026/" : "") + parts.slice(-2).join("/");
}
function displayPath(p, root, opts) {
  const rel2 = relativePath(p, root);
  if (opts.hidePaths) {
    const base2 = rel2.split("/").pop() ?? "";
    const dot = base2.lastIndexOf(".");
    return dot > 0 ? "\u2022\u2022\u2022" + base2.slice(dot) : "\u2022\u2022\u2022";
  }
  return truncate(maskSecrets(rel2), 160);
}
function displayCommand(cmd, opts) {
  const masked = maskSecrets(cmd);
  if (opts.showContent) return truncate(masked, 120);
  const first = masked.trim().split(/\s+/)[0] ?? "";
  const prog = first.split("/").pop() ?? first;
  return prog ? prog + " \u2026" : "\u2026";
}
function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

// packages/protocol/src/mapping.ts
var str = (v) => typeof v === "string" && v.length > 0 ? v : void 0;
var counter = 0;
function defaultId(now) {
  counter = (counter + 1) % 1e6;
  return now.toString(36) + "-" + counter.toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
function hashId(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
function projectFromDir(dir) {
  if (!dir) return void 0;
  const norm = dir.replace(/\\/g, "/").replace(/\/+$/, "");
  const name = norm.split("/").pop() || norm || "project";
  return { id: "p-" + hashId(norm), name: truncate(name, 60) };
}
function statusForTool(tool) {
  switch (tool) {
    case "Read":
    case "Grep":
    case "Glob":
    case "LS":
    case "NotebookRead":
      return "reading";
    case "Edit":
    case "Write":
    case "MultiEdit":
    case "NotebookEdit":
      return "writing";
    case "Bash":
    case "BashOutput":
    case "KillShell":
    case "KillBash":
    case "PowerShell":
    case "Monitor":
      return "running";
    case "WebSearch":
    case "WebFetch":
      return "searching";
    default:
      if (tool.startsWith("mcp__")) return "searching";
      return "thinking";
  }
}
function describeTool(tool, input, root, opts) {
  const rules = opts.deptRules;
  const p = str(input.file_path) ?? str(input.notebook_path) ?? str(input.path);
  switch (tool) {
    case "Bash":
    case "PowerShell": {
      const cmd = str(input.command) ?? "";
      return { target: displayCommand(cmd, opts), dept: classifyDept({ tool, command: cmd }, rules) ?? "devops" };
    }
    case "WebFetch":
      return { target: hostOf(str(input.url) ?? "") || "web", dept: "research" };
    case "WebSearch":
      return { target: opts.showContent ? truncate(maskSecrets(str(input.query) ?? ""), 80) : "web search", dept: "research" };
    case "Agent":
    case "Task": {
      const kind = str(input.subagent_type) ?? "agent";
      const desc = opts.showContent && str(input.description) ? ": " + truncate(maskSecrets(str(input.description)), 60) : "";
      return { target: kind + desc };
    }
    case "Grep": {
      const where = p ? displayPath(p, root, opts) : ".";
      const pat = opts.showContent && str(input.pattern) ? " /" + truncate(maskSecrets(str(input.pattern)), 40) + "/" : "";
      return { target: where + pat, dept: p ? classifyDept({ tool, path: rel(p, root) }, rules) : void 0 };
    }
    case "Glob": {
      const pat = str(input.pattern) ?? "";
      return { target: truncate(maskSecrets(pat), 80), dept: classifyDept({ tool, path: pat }, rules) };
    }
    default:
      if (tool.startsWith("mcp__")) return { target: tool.split("__")[1] ?? "mcp", dept: "research" };
      if (p) return { target: displayPath(p, root, opts), dept: classifyDept({ tool, path: rel(p, root) }, rules) };
      return {};
  }
}
function rel(p, root) {
  const norm = p.replace(/\\/g, "/");
  if (root) {
    const r = root.replace(/\\/g, "/").replace(/\/+$/, "");
    if (norm.startsWith(r + "/")) return norm.slice(r.length + 1);
  }
  return norm.replace(/^\/+/, "");
}
function hookToEvents(raw, opts = {}) {
  if (!raw || typeof raw !== "object") return [];
  const p = raw;
  const hook = str(p.hook_event_name);
  const session_id = str(p.session_id);
  if (!hook || !session_id) return [];
  const now = opts.now ?? Date.now();
  const makeId = opts.makeId ?? (() => defaultId(now));
  const root = opts.projectDir ?? str(p.cwd);
  const project = projectFromDir(root);
  const agent_id = str(p.agent_id) ?? MAIN_AGENT_ID;
  const common = { v: SCHEMA_VERSION, ts: now, source: opts.source ?? "local", session_id, ...project ? { project } : {} };
  const ev = (body) => ({ ...common, id: makeId(), ...body });
  const status = (a, s, dept) => ev({ type: "agent.status", agent_id: a, status: s, ...dept ? { dept } : {} });
  const tool = str(p.tool_name) ?? "unknown";
  const toolUseId = str(p.tool_use_id);
  const transcript = opts.includeTranscripts ? str(p.transcript_path) : void 0;
  switch (hook) {
    case "SessionStart":
      return [
        ev({ type: "session.start", reason: str(p.source) ?? "startup", ...transcript ? { transcript } : {} }),
        ev({ type: "agent.spawn", agent_id: MAIN_AGENT_ID, agent_type: "director" }),
        status(MAIN_AGENT_ID, "idle")
      ];
    case "SessionEnd":
      return [ev({ type: "session.end", reason: truncate(str(p.reason) ?? "other", 40) })];
    case "UserPromptSubmit":
      return [status(MAIN_AGENT_ID, "thinking")];
    case "PreToolUse": {
      const input = p.tool_input && typeof p.tool_input === "object" ? p.tool_input : {};
      const d = describeTool(tool, input, root, opts);
      return [
        ev({
          type: "tool.call",
          agent_id,
          name: truncate(tool, 120),
          ...toolUseId ? { tool_use_id: toolUseId } : {},
          ...d.target ? { target: d.target } : {},
          ...d.dept ? { dept: d.dept } : {}
        }),
        status(agent_id, statusForTool(tool), d.dept)
      ];
    }
    case "PostToolUse":
    case "PostToolUseFailure": {
      const ok = hook === "PostToolUse";
      const dur = typeof p.duration_ms === "number" && p.duration_ms >= 0 ? { duration_ms: p.duration_ms } : {};
      const out = [
        ev({ type: "tool.result", agent_id, name: truncate(tool, 120), ok, ...toolUseId ? { tool_use_id: toolUseId } : {}, ...dur })
      ];
      if (!ok && p.is_interrupt !== true) out.push(status(agent_id, "error"));
      else out.push(status(agent_id, "thinking"));
      return out;
    }
    case "PermissionRequest":
      return [
        status(agent_id, "waiting_user"),
        ev({ type: "notify", kind: "permission_prompt", agent_id, message: "permission: " + truncate(tool, 60) })
      ];
    case "Notification": {
      const kind = str(p.notification_type) ?? "notice";
      const message = str(p.message);
      const out = [ev({ type: "notify", kind: truncate(kind, 60), agent_id, ...message ? { message: truncate(maskSecrets(message), 200) } : {} })];
      if (kind === "permission_prompt" || kind === "elicitation_dialog") out.unshift(status(agent_id, "waiting_user"));
      else if (kind === "idle_prompt") out.unshift(status(MAIN_AGENT_ID, "idle"));
      return out;
    }
    case "SubagentStart":
      return [
        ev({ type: "agent.spawn", agent_id, agent_type: truncate(str(p.agent_type) ?? "agent", 80) }),
        status(agent_id, "thinking")
      ];
    case "SubagentStop": {
      const t = opts.includeTranscripts ? str(p.agent_transcript_path) : void 0;
      return [status(agent_id, "done"), ev({ type: "agent.end", agent_id, ok: true, ...t ? { transcript: t } : {} })];
    }
    case "Stop":
      return [status(MAIN_AGENT_ID, "idle")];
    case "StopFailure":
      return [status(MAIN_AGENT_ID, "error")];
    case "TaskCreated":
    case "TaskCompleted": {
      const task_id = str(p.task_id) ?? makeId();
      const subject = truncate(maskSecrets(str(p.task_subject) ?? "task"), 120);
      return [ev({ type: hook === "TaskCreated" ? "task.created" : "task.completed", task_id, subject, ...p.agent_id ? { agent_id } : {} })];
    }
    default:
      return [];
  }
}

// packages/protocol/src/transcript.ts
var isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
var str2 = (v) => typeof v === "string" ? v : void 0;
function parseJsonl(text) {
  const out = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (isObj(o)) out.push(o);
    } catch {
    }
  }
  return out;
}
function usageOf(line) {
  const msg = isObj(line.message) ? line.message : void 0;
  const u = msg && isObj(msg.usage) ? msg.usage : void 0;
  if (!u) return void 0;
  const n = (k) => typeof u[k] === "number" ? u[k] : 0;
  const input = n("input_tokens");
  const output = n("output_tokens");
  const cacheCreate = n("cache_creation_input_tokens");
  const cacheRead = n("cache_read_input_tokens");
  return { input, output, cacheCreate, cacheRead, tokens: input + output + cacheCreate };
}
function sumUsage(lines) {
  const seen = /* @__PURE__ */ new Set();
  const t = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0, tokens: 0 };
  for (const l of lines) {
    if (l.type !== "assistant") continue;
    const msg = isObj(l.message) ? l.message : void 0;
    const key = str2(msg?.id) ?? str2(l.requestId) ?? str2(l.uuid);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    const u = usageOf(l);
    if (!u) continue;
    t.input += u.input;
    t.output += u.output;
    t.cacheCreate += u.cacheCreate;
    t.cacheRead += u.cacheRead;
    t.tokens += u.tokens;
  }
  return t;
}
function transcriptToEvents(mainText, opts = {}) {
  const lines = parseJsonl(mainText);
  const sub = (opts.subagents ?? []).flatMap((s) => parseJsonl(s.text).map((l) => s.agentId && !l.agentId ? { ...l, agentId: s.agentId } : l));
  const all = [...lines, ...sub].map((l, i) => ({ l, t: Date.parse(str2(l.timestamp) ?? "") || 0, i })).filter((x) => x.t > 0).sort((a, b) => a.t - b.t || a.i - b.i);
  if (all.length === 0) return [];
  const first = all[0].l;
  const session_id = str2(first.sessionId) ?? "replay-" + all[0].t.toString(36);
  const cwd = all.map((x) => str2(x.l.cwd)).find(Boolean);
  const map = { source: "replay", projectDir: cwd, showContent: opts.showContent, hidePaths: opts.hidePaths };
  const events = [];
  const push = (payload, ts) => events.push(...hookToEvents({ session_id, cwd, ...payload }, { ...map, now: ts }));
  push({ hook_event_name: "SessionStart", source: "replay" }, all[0].t);
  const toolNames = /* @__PURE__ */ new Map();
  const spawned = /* @__PURE__ */ new Set();
  const seenMsg = /* @__PURE__ */ new Set();
  for (const { l, t } of all) {
    const agentId = str2(l.agentId);
    const owner = agentId && l.isSidechain !== false ? agentId : void 0;
    const msg = isObj(l.message) ? l.message : void 0;
    const content = msg?.content;
    if (owner && !spawned.has(owner)) {
      spawned.add(owner);
      push({ hook_event_name: "SubagentStart", agent_id: owner, agent_type: str2(l.agentType) ?? "agent" }, t);
    }
    if (l.type === "user" && !owner && typeof content === "string" && l.isMeta !== true) {
      push({ hook_event_name: "UserPromptSubmit" }, t);
    }
    if (l.type === "assistant" && Array.isArray(content)) {
      for (const block of content) {
        if (!isObj(block) || block.type !== "tool_use") continue;
        const name = str2(block.name) ?? "unknown";
        const id2 = str2(block.id);
        if (id2) toolNames.set(id2, { name, ...owner ? { agent: owner } : {}, t });
        push(
          { hook_event_name: "PreToolUse", tool_name: name, tool_input: isObj(block.input) ? block.input : {}, tool_use_id: id2, ...owner ? { agent_id: owner } : {} },
          t
        );
      }
      const u = usageOf(l);
      const key = str2(msg?.id) ?? str2(l.uuid) ?? "";
      if (u && u.tokens > 0 && !seenMsg.has(key)) {
        seenMsg.add(key);
        events.push({
          v: SCHEMA_VERSION,
          id: "tok-" + key.slice(-12) + "-" + t.toString(36),
          ts: t,
          source: "replay",
          session_id,
          ...projectFromDir(cwd) ? { project: projectFromDir(cwd) } : {},
          type: "cost.tick",
          agent_id: owner ?? MAIN_AGENT_ID,
          tokens: u.tokens,
          mode: "delta"
        });
      }
    }
    if (l.type === "user" && Array.isArray(content)) {
      for (const block of content) {
        if (!isObj(block) || block.type !== "tool_result") continue;
        const id2 = str2(block.tool_use_id);
        const call = id2 ? toolNames.get(id2) : void 0;
        const name = call?.name ?? "unknown";
        const failed = block.is_error === true;
        push(
          {
            hook_event_name: failed ? "PostToolUseFailure" : "PostToolUse",
            tool_name: name,
            tool_use_id: id2,
            duration_ms: call ? Math.max(0, t - call.t) : void 0,
            ...call?.agent ? { agent_id: call.agent } : {}
          },
          t
        );
        const result = isObj(l.toolUseResult) ? l.toolUseResult : void 0;
        const subId = result ? str2(result.agentId) : void 0;
        if ((name === "Agent" || name === "Task") && subId) {
          if (!spawned.has(subId)) {
            spawned.add(subId);
            push({ hook_event_name: "SubagentStart", agent_id: subId, agent_type: str2(result?.agentType) ?? "agent" }, call?.t ?? t);
          }
          push({ hook_event_name: "SubagentStop", agent_id: subId, agent_type: str2(result?.agentType) ?? "agent" }, t);
        }
      }
    }
  }
  push({ hook_event_name: "Stop" }, all[all.length - 1].t + 1);
  return events.sort((a, b) => a.ts - b.ts);
}

// packages/daemon/src/demo.ts
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var PROJECTS = [
  {
    dir: "/demo/atlas-web",
    source: "demo",
    files: ["src/components/Header.tsx", "src/components/PriceCard.tsx", "src/pages/checkout.tsx", "src/styles/theme.css", "src/hooks/useCart.ts", "src/api/client.ts", "src/components/PriceCard.test.tsx", "README.md", "docs/design-tokens.md", "src/auth/session.ts", "vite.config.ts", "public/index.html"],
    commands: ["npm run build", "npx vitest run", "npx playwright test", "git status", "npm run lint"]
  },
  {
    dir: "/demo/billing-api",
    source: "demo",
    files: ["server/routes/invoices.go", "server/db/migrations/0042_tax.sql", "server/payments/stripe_adapter.go", "api/openapi.yaml", "server/routes/invoices_test.go", "docs/runbook.md", "server/auth/jwt.go", "Dockerfile", ".github/workflows/ci.yml"],
    commands: ["go test ./...", "go build ./...", "docker compose up -d db", "make migrate", "git diff --stat"]
  },
  {
    dir: "/demo/cloud-pipeline",
    source: "cloud",
    files: ["pipelines/ingest.py", "pipelines/transform.py", "tests/test_transform.py", "infra/main.tf", "k8s/worker.yaml", "docs/data-contract.md"],
    commands: ["pytest -q", "terraform plan", "kubectl get pods", "python -m pipelines.ingest --dry-run"]
  }
];
var TYPES = ["Explore", "general-purpose", "Plan", "code-reviewer", "test-runner", "docs-writer", "security-auditor", "frontend-dev"];
var DemoGenerator = class {
  constructor(emit, opts = {}) {
    this.emit = emit;
    this.opts = opts;
    this.r = rng(opts.seed ?? 20261030);
  }
  emit;
  opts;
  timers = /* @__PURE__ */ new Set();
  r;
  active = 0;
  sessions = [];
  stopped = false;
  taskSeq = 1;
  agentSeq = 1;
  pick(xs) {
    return xs[Math.floor(this.r() * xs.length)];
  }
  later(ms, fn) {
    if (this.stopped) return;
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.stopped) fn();
    }, ms * (this.opts.pace ?? 1));
    t.unref?.();
    this.timers.add(t);
  }
  hook(session, payload) {
    const raw = hookToEvents({ session_id: session.id, cwd: session.project.dir, ...payload }, { source: session.project.source, projectDir: session.project.dir, showContent: true });
    this.emit(validateEvents(raw).ok);
  }
  start() {
    const target = this.opts.agents ?? 9;
    const plan = [
      [PROJECTS[0], 0],
      [PROJECTS[1], 150],
      [PROJECTS[0], 300],
      [PROJECTS[2], 450]
    ];
    for (const [p, delay] of plan) this.later(delay, () => this.openSession(p));
    const tick = () => {
      if (this.active < target && this.sessions.length) {
        const s = this.pick(this.sessions);
        this.spawn(s, "main", 0);
      }
      this.later(600 + this.r() * 1400, tick);
    };
    this.later(500, tick);
    const churn = () => {
      if (this.sessions.length > 3 && this.r() < 0.5) {
        const s = this.sessions.find((x) => x.agents === 0);
        if (s) {
          this.hook(s, { hook_event_name: "Stop" });
          this.hook(s, { hook_event_name: "SessionEnd", reason: "other" });
          this.sessions = this.sessions.filter((x) => x !== s);
        }
      } else if (this.sessions.length < 5) this.openSession(this.pick(PROJECTS));
      this.later(45e3 + this.r() * 6e4, churn);
    };
    this.later(4e4, churn);
  }
  stop() {
    this.stopped = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }
  openSession(project) {
    const id2 = "demo-" + Math.floor(this.r() * 1e9).toString(36) + "-" + this.sessions.length;
    const s = { id: id2, project, agents: 0 };
    this.sessions.push(s);
    this.hook(s, { hook_event_name: "SessionStart", source: "startup" });
    this.later(200, () => this.hook(s, { hook_event_name: "UserPromptSubmit", prompt: "(demo)" }));
    const subject = this.pick(["Fix flaky checkout test", "Add tax line to invoices", "Document deploy runbook", "Refactor auth middleware", "Speed up CI cache", "Audit dependencies", "Polish price cards"]);
    const taskId = String(this.taskSeq++);
    this.later(600, () => this.hook(s, { hook_event_name: "TaskCreated", task_id: taskId, task_subject: subject }));
    this.later(6e4 + this.r() * 9e4, () => this.hook(s, { hook_event_name: "TaskCompleted", task_id: taskId, task_subject: subject }));
  }
  spawn(s, parent, depth) {
    const agent_id = "a" + (this.agentSeq++).toString(16).padStart(4, "0") + Math.floor(this.r() * 16777215).toString(16);
    const type = this.pick(TYPES);
    this.active++;
    s.agents++;
    const desc = this.pick(["Find usages of price formatter", "Review the checkout diff", "Run the test suite", "Write migration notes", "Investigate 500s on /invoices", "Check auth token expiry"]);
    if (parent === "main") this.hook(s, { hook_event_name: "PreToolUse", tool_name: "Agent", tool_input: { subagent_type: type, description: desc }, tool_use_id: "tu-" + agent_id });
    else this.hook(s, { hook_event_name: "PreToolUse", agent_id: parent, tool_name: "Agent", tool_input: { subagent_type: type, description: desc }, tool_use_id: "tu-" + agent_id });
    this.later(250, () => this.hook(s, { hook_event_name: "SubagentStart", agent_id, agent_type: type }));
    const steps = this.planFor(type, s.project);
    let t = 900;
    steps.forEach((st, i) => {
      const id2 = `${agent_id}-${i}`;
      this.later(t, () => this.hook(s, { hook_event_name: "PreToolUse", agent_id, agent_type: type, tool_name: st.tool, tool_input: st.input, tool_use_id: id2 }));
      if (st.ask) {
        this.later(t + 300, () => this.hook(s, { hook_event_name: "PermissionRequest", agent_id, agent_type: type, tool_name: st.tool, tool_input: st.input }));
        t += 6e3 + this.r() * 6e3;
      }
      t += st.ms;
      this.later(
        t,
        () => this.hook(s, { hook_event_name: st.fail ? "PostToolUseFailure" : "PostToolUse", agent_id, agent_type: type, tool_name: st.tool, tool_use_id: id2, duration_ms: st.ms, is_interrupt: false })
      );
      t += st.fail ? 2500 : 500 + this.r() * 1200;
    });
    if (depth === 0 && this.r() < 0.22) this.later(t / 2, () => this.spawn(s, agent_id, depth + 1));
    this.later(t + 600, () => {
      this.hook(s, { hook_event_name: "SubagentStop", agent_id, agent_type: type });
      this.hook(s, { hook_event_name: "PostToolUse", ...parent === "main" ? {} : { agent_id: parent }, tool_name: "Agent", tool_use_id: "tu-" + agent_id, duration_ms: t });
      const tokens = Math.floor(4e3 + this.r() * 4e4);
      this.emit(
        validateEvents([{ v: 1, id: "tok-" + agent_id, ts: Date.now(), source: s.project.source, session_id: s.id, project: projectFromDir(s.project.dir), type: "cost.tick", agent_id, tokens, usd: tokens * 6e-6, mode: "absolute" }]).ok
      );
      this.active--;
      s.agents--;
      if (s.agents === 0) this.later(400, () => this.hook(s, { hook_event_name: "Stop" }));
    });
  }
  planFor(type, p) {
    const f2 = () => p.dir + "/" + this.pick(p.files);
    const n = 3 + Math.floor(this.r() * 6);
    const out = [];
    for (let i = 0; i < n; i++) {
      const roll = this.r();
      let step;
      if (type === "Explore" || type === "Plan") step = roll < 0.5 ? { tool: "Read", input: { file_path: f2() }, ms: 900 } : roll < 0.8 ? { tool: "Grep", input: { pattern: "formatPrice", path: p.dir + "/src" }, ms: 700 } : { tool: "WebSearch", input: { query: "best practice" }, ms: 3500 };
      else if (type === "test-runner") step = roll < 0.6 ? { tool: "Bash", input: { command: this.pick(p.commands.filter((c) => /test|pytest/.test(c))) ?? "npm test" }, ms: 5e3 + this.r() * 7e3, fail: this.r() < 0.3 } : { tool: "Read", input: { file_path: f2() }, ms: 800 };
      else if (type === "docs-writer") step = roll < 0.5 ? { tool: "Write", input: { file_path: p.dir + "/docs/notes.md" }, ms: 2500 } : { tool: "Read", input: { file_path: f2() }, ms: 900 };
      else if (type === "security-auditor") step = roll < 0.6 ? { tool: "Grep", input: { pattern: "secret", path: p.dir + "/src/auth" }, ms: 1200 } : { tool: "WebFetch", input: { url: "https://nvd.nist.gov/" }, ms: 3e3 };
      else
        step = roll < 0.35 ? { tool: "Edit", input: { file_path: f2() }, ms: 1800 + this.r() * 2e3 } : roll < 0.6 ? { tool: "Read", input: { file_path: f2() }, ms: 900 } : roll < 0.85 ? { tool: "Bash", input: { command: this.pick(p.commands) }, ms: 3e3 + this.r() * 6e3, fail: this.r() < 0.18 } : { tool: "WebSearch", input: { query: "docs" }, ms: 3e3 };
      if (step.tool === "Bash" && this.r() < 0.12) step.ask = true;
      out.push(step);
    }
    return out;
  }
};

// packages/daemon/src/paths.ts
import os from "node:os";
import path2 from "node:path";
function dataDir(env = process.env) {
  return env.AO_DATA_DIR || env.CLAUDE_PLUGIN_DATA || path2.join(os.homedir(), ".claude", "plugins", "data", "agent-office");
}
function files(dir = dataDir()) {
  return {
    dir,
    daemon: path2.join(dir, "daemon.json"),
    lock: path2.join(dir, "daemon.lock"),
    token: path2.join(dir, "token"),
    spool: path2.join(dir, "spool.jsonl"),
    journal: path2.join(dir, "events.jsonl"),
    config: path2.join(dir, "agent-office.config.json"),
    log: path2.join(dir, "daemon.log")
  };
}
var VERSION = "0.1.0";

// packages/daemon/src/relay-client.ts
import http from "node:http";
import https from "node:https";
var RelayClient = class {
  constructor(daemon, url, token) {
    this.daemon = daemon;
    this.url = url;
    this.token = token;
  }
  daemon;
  url;
  token;
  req;
  stopped = false;
  backoff = 1e3;
  timer;
  start() {
    this.connect();
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.req?.destroy();
  }
  status(relay) {
    this.daemon.setLink({ ...this.daemon.link, relay, relayUrl: new URL(this.url).host });
  }
  connect() {
    if (this.stopped) return;
    this.status("connecting");
    const u = new URL(this.url.replace(/\/+$/, "") + "/stream");
    const lib = u.protocol === "https:" ? https : http;
    let buf = "";
    this.req = lib.get(u, { headers: { authorization: "Bearer " + this.token, accept: "text/event-stream" }, timeout: 6e4 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return this.retry();
      }
      this.backoff = 1e3;
      this.status("online");
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        buf += chunk;
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          this.onBlock(block);
        }
        if (buf.length > 2e6) buf = "";
      });
      res.on("end", () => this.retry());
      res.on("error", () => this.retry());
    });
    this.req.on("timeout", () => this.req?.destroy());
    this.req.on("error", () => this.retry());
  }
  onBlock(block) {
    let name = "message";
    const data = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (!data.length) return;
    try {
      const parsed = JSON.parse(data.join("\n"));
      const items = name === "snapshot" ? parsed.events : parsed;
      const { ok } = validateEvents(Array.isArray(items) ? items : [items]);
      this.daemon.ingest(ok.map((e) => ({ ...e, source: "cloud" })));
    } catch {
    }
  }
  retry() {
    if (this.stopped) return;
    this.req?.destroy();
    this.req = void 0;
    this.status("offline");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.connect(), this.backoff);
    this.backoff = Math.min(this.backoff * 2, 3e4);
  }
};

// packages/daemon/src/server.ts
import fs3 from "node:fs";
import http2 from "node:http";
import os2 from "node:os";
import path3 from "node:path";

// packages/daemon/src/store.ts
import fs2 from "node:fs";
var EventStore = class {
  constructor(journalFile, capacity = 5e3, maxJournalBytes = 2e7) {
    this.journalFile = journalFile;
    this.capacity = capacity;
    this.maxJournalBytes = maxJournalBytes;
    if (journalFile) {
      try {
        this.journalBytes = fs2.statSync(journalFile).size;
      } catch {
        this.journalBytes = 0;
      }
    }
  }
  journalFile;
  capacity;
  maxJournalBytes;
  ring = [];
  seen = /* @__PURE__ */ new Set();
  journalFd;
  journalBytes = 0;
  /** Restores the ring from the journal tail (state survives daemon restarts). */
  restore() {
    if (!this.journalFile) return 0;
    let text = "";
    try {
      const st = fs2.statSync(this.journalFile);
      const len = Math.min(st.size, 4e6);
      const fd = fs2.openSync(this.journalFile, "r");
      const buf = Buffer.alloc(len);
      fs2.readSync(fd, buf, 0, len, st.size - len);
      fs2.closeSync(fd);
      text = buf.toString("utf8");
    } catch {
      return 0;
    }
    const { ok } = validateEvents(parseJsonl(text));
    for (const e of ok) this.remember(e);
    return ok.length;
  }
  remember(e) {
    if (this.seen.has(e.id)) return false;
    this.seen.add(e.id);
    this.ring.push(e);
    if (this.ring.length > this.capacity) {
      const drop = this.ring.splice(0, this.ring.length - this.capacity);
      for (const d of drop) this.seen.delete(d.id);
    }
    return true;
  }
  /** Adds events (deduplicated by id); returns the ones that were new. Local-only fields are dropped before storage. */
  add(events, persist = true) {
    const fresh = [];
    for (const raw of events) {
      const e = stripLocalFields(raw);
      if (this.remember(e)) fresh.push(e);
    }
    if (persist && fresh.length && this.journalFile) this.append(fresh);
    return fresh;
  }
  append(events) {
    try {
      if (this.journalBytes > this.maxJournalBytes) {
        if (this.journalFd !== void 0) fs2.closeSync(this.journalFd);
        this.journalFd = void 0;
        fs2.renameSync(this.journalFile, this.journalFile + ".1");
        this.journalBytes = 0;
      }
      this.journalFd ??= fs2.openSync(this.journalFile, "a");
      const chunk = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
      fs2.writeSync(this.journalFd, chunk);
      this.journalBytes += Buffer.byteLength(chunk);
    } catch {
    }
  }
  all() {
    return this.ring;
  }
  since(ts) {
    return this.ring.filter((e) => e.ts >= ts);
  }
  close() {
    if (this.journalFd !== void 0) fs2.closeSync(this.journalFd);
    this.journalFd = void 0;
  }
};
function drainSpool(spoolFile) {
  const tmp = spoolFile + ".draining";
  try {
    fs2.renameSync(spoolFile, tmp);
  } catch {
    return [];
  }
  try {
    return validateEvents(parseJsonl(fs2.readFileSync(tmp, "utf8"))).ok;
  } catch {
    return [];
  } finally {
    try {
      fs2.unlinkSync(tmp);
    } catch {
    }
  }
}

// packages/daemon/src/server.ts
var MAX_BODY = 512 * 1024;
var MAX_REPLAY_BODY = 16 * 1024 * 1024;
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};
var OfficeDaemon = class {
  constructor(opts) {
    this.opts = opts;
    this.config = opts.config;
    this.store = new EventStore(opts.journalFile);
    this.server = http2.createServer((req, res) => {
      this.handle(req, res).catch(() => {
        if (!res.headersSent) send(res, 500, { error: "internal" });
        else res.end();
      });
    });
    this.server.headersTimeout = 1e4;
    this.server.requestTimeout = 3e4;
  }
  opts;
  store;
  server;
  config;
  link = { relay: "off" };
  clients = /* @__PURE__ */ new Set();
  nextClient = 1;
  port = 0;
  heartbeat;
  transcripts = /* @__PURE__ */ new Map();
  usageTimers = /* @__PURE__ */ new Map();
  stats = { received: 0, rejected: 0 };
  async listen(port, host = "127.0.0.1") {
    await new Promise((resolve, reject) => {
      const onErr = (e) => {
        this.server.off("listening", onOk);
        reject(e);
      };
      const onOk = () => {
        this.server.off("error", onErr);
        resolve();
      };
      this.server.once("error", onErr);
      this.server.once("listening", onOk);
      this.server.listen(port, host);
    });
    this.port = this.server.address().port;
    this.heartbeat = setInterval(() => this.broadcastRaw(": ping\n\n"), 15e3);
    this.heartbeat.unref();
    return this.port;
  }
  async close() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const t of this.usageTimers.values()) clearTimeout(t);
    for (const c of this.clients) c.res.end();
    this.clients.clear();
    this.store.close();
    await new Promise((r) => this.server.close(() => r()));
  }
  /** Single entry point for every event source (hooks, spool, demo, relay, replay). */
  ingest(events, persist = true) {
    for (const e of events) this.watchUsage(e);
    const fresh = this.store.add(events, persist);
    if (fresh.length) {
      this.broadcast("events", fresh);
      if (fresh.some((e) => e.source === "cloud")) this.link.lastEventAt = Date.now();
    }
    return fresh;
  }
  setLink(l) {
    this.link = l;
    this.broadcast("link", l);
  }
  // ---- token totals from local transcripts -------------------------------------------------
  watchUsage(e) {
    if (e.source !== "local") return;
    if (e.type === "session.start" && e.transcript) this.transcripts.set(e.session_id, e.transcript);
    if (e.type === "agent.end" && e.transcript) this.scheduleUsage(e, e.agent_id, e.transcript, 300);
    if (e.type === "agent.status" && e.agent_id === "main" && e.status === "idle") {
      const t = this.transcripts.get(e.session_id) ?? this.findTranscript(e.session_id);
      if (t) this.scheduleUsage(e, "main", t, 1500);
    }
  }
  findTranscript(sessionId) {
    if (!/^[\w-]+$/.test(sessionId)) return void 0;
    const root = this.opts.projectsDir ?? path3.join(os2.homedir(), ".claude", "projects");
    try {
      for (const d of fs3.readdirSync(root)) {
        const p = path3.join(root, d, sessionId + ".jsonl");
        if (fs3.existsSync(p)) {
          this.transcripts.set(sessionId, p);
          return p;
        }
      }
    } catch {
    }
    return void 0;
  }
  scheduleUsage(e, agentId, file, delay) {
    const key = e.session_id + "/" + agentId;
    clearTimeout(this.usageTimers.get(key));
    const t = setTimeout(() => {
      this.usageTimers.delete(key);
      try {
        const st = fs3.statSync(file);
        if (st.size > 5e7) return;
        const usage = sumUsage(parseJsonl(fs3.readFileSync(file, "utf8")));
        if (usage.tokens <= 0) return;
        const { ok } = validateEvents([
          {
            v: SCHEMA_VERSION,
            id: `tok-${key}-${Date.now().toString(36)}`,
            ts: Date.now(),
            source: "local",
            session_id: e.session_id,
            ...e.project ? { project: e.project } : {},
            type: "cost.tick",
            agent_id: agentId,
            tokens: usage.tokens,
            mode: "absolute"
          }
        ]);
        this.ingest(ok);
      } catch {
      }
    }, delay);
    t.unref();
    this.usageTimers.set(key, t);
  }
  // ---- HTTP --------------------------------------------------------------------------------
  allowedOrigins() {
    const p = this.port;
    return /* @__PURE__ */ new Set([`http://127.0.0.1:${p}`, `http://localhost:${p}`, ...this.opts.extraOrigins ?? []]);
  }
  hostOk(req) {
    const host = (req.headers.host ?? "").toLowerCase();
    const name = host.replace(/:\d+$/, "");
    return name === "127.0.0.1" || name === "localhost" || name === "[::1]";
  }
  tokenOk(req, url) {
    const auth = req.headers.authorization;
    const header = req.headers["x-ao-token"];
    const given = typeof header === "string" && header || (auth?.startsWith("Bearer ") ? auth.slice(7) : "") || url.searchParams.get("t") || "";
    return safeEqual(given, this.opts.token);
  }
  async handle(req, res) {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (!this.hostOk(req)) return send(res, 421, { error: "bad host" });
    const origin = req.headers.origin;
    if (origin && !this.allowedOrigins().has(origin)) return send(res, 403, { error: "origin not allowed" });
    if (origin) res.setHeader("vary", "origin");
    if (url.pathname === "/health") return send(res, 200, { ok: true, app: "agent-office", v: SCHEMA_VERSION });
    const api = ["/events", "/stream", "/snapshot", "/config", "/replay", "/stats", "/demo"];
    if (api.includes(url.pathname)) {
      if (!this.tokenOk(req, url)) return send(res, 401, { error: "token required" });
      if (url.pathname === "/events" && req.method === "POST") return this.postEvents(req, res);
      if (url.pathname === "/stream" && req.method === "GET") return this.stream(req, res);
      if (url.pathname === "/snapshot" && req.method === "GET") return send(res, 200, this.snapshot());
      if (url.pathname === "/stats" && req.method === "GET") return send(res, 200, { ...this.stats, clients: this.clients.size, events: this.store.all().length });
      if (url.pathname === "/config" && req.method === "POST") return this.postConfig(req, res);
      if (url.pathname === "/replay" && req.method === "POST") return this.postReplay(req, res);
      if (url.pathname === "/demo" && req.method === "POST") {
        const on = url.searchParams.get("on") !== "0";
        const demo = this.opts.setDemo?.(on) ?? false;
        this.broadcast("demo", { demo });
        return send(res, 200, { demo });
      }
      return send(res, 405, { error: "method" });
    }
    if (req.method === "GET" || req.method === "HEAD") return this.serveStatic(url.pathname, res);
    return send(res, 404, { error: "not found" });
  }
  demo = false;
  opts_setDemo(on) {
    return this.opts.setDemo?.(on) ?? false;
  }
  snapshot() {
    return { v: SCHEMA_VERSION, now: Date.now(), events: this.store.all(), config: publicConfig(this.config), link: this.link, demo: this.demo };
  }
  async postEvents(req, res) {
    const body = await readBody(req, MAX_BODY);
    if (body === void 0) return send(res, 413, { error: "body too large" });
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return send(res, 400, { error: "bad json" });
    }
    const { ok, rejected } = validateEvents(parsed);
    this.stats.received += ok.length;
    this.stats.rejected += rejected;
    this.ingest(ok);
    send(res, 202, { accepted: ok.length, rejected });
  }
  async postConfig(req, res) {
    const body = await readBody(req, 64 * 1024);
    let patch = {};
    try {
      patch = JSON.parse(body ?? "{}");
    } catch {
      return send(res, 400, { error: "bad json" });
    }
    const allowed = {};
    for (const k of UI_WRITABLE) if (k in patch) allowed[k] = patch[k];
    this.config = this.opts.configFile ? saveConfig(this.opts.configFile, allowed) : { ...this.config, ...allowed };
    this.broadcast("config", publicConfig(this.config));
    send(res, 200, publicConfig(this.config));
  }
  /**
   * Plays a transcript back as source "replay", time-compressed. Body is either raw JSONL
   * (content-type application/x-ndjson) or JSON {main, subagents?: string[]}.
   */
  async postReplay(req, res) {
    const body = await readBody(req, MAX_REPLAY_BODY);
    if (body === void 0) return send(res, 413, { error: "body too large" });
    const speed = Math.max(1, Math.min(500, Number(new URL(req.url ?? "/", "http://x").searchParams.get("speed")) || 20));
    let main2 = body;
    let subagents = [];
    if ((req.headers["content-type"] ?? "").startsWith("application/json")) {
      try {
        const o = JSON.parse(body);
        main2 = typeof o.main === "string" ? o.main : "";
        subagents = Array.isArray(o.subagents) ? o.subagents.filter((x) => typeof x === "string").map((text) => ({ text })) : [];
      } catch {
        return send(res, 400, { error: "bad json" });
      }
    }
    const events = validateEvents(transcriptToEvents(main2, { subagents, showContent: this.config.showContent, hidePaths: this.config.hidePaths })).ok;
    send(res, 202, { events: events.length, speed });
    this.playback(events, speed);
  }
  playback(events, speed) {
    if (!events.length) return;
    const t0 = events[0].ts;
    const now = Date.now();
    for (const e of events) {
      const delay = Math.min((e.ts - t0) / speed, 10 * 6e4);
      const t = setTimeout(() => this.ingest([{ ...e, ts: now + delay }]), delay);
      t.unref();
    }
  }
  stream(req, res) {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    });
    res.write("retry: 2000\n\n");
    const client = { res, id: this.nextClient++ };
    this.clients.add(client);
    writeEvent(res, "snapshot", this.snapshot());
    req.on("close", () => this.clients.delete(client));
  }
  broadcast(name, data) {
    const payload = Array.isArray(data) ? data.map((e) => stripLocalFields(e)) : data;
    const chunk = `event: ${name}
data: ${JSON.stringify(payload)}

`;
    this.broadcastRaw(chunk);
  }
  broadcastRaw(chunk) {
    for (const c of this.clients) {
      try {
        c.res.write(chunk);
      } catch {
        this.clients.delete(c);
      }
    }
  }
  serveStatic(pathname, res) {
    const root = this.opts.webDir;
    if (!root) return send(res, 404, { error: "ui not built" });
    let rel2 = decodeURIComponent(pathname);
    if (rel2 === "/" || rel2 === "") rel2 = "/index.html";
    const file = path3.resolve(root, "." + rel2);
    if (!file.startsWith(path3.resolve(root) + path3.sep)) return send(res, 403, { error: "forbidden" });
    let target = file;
    try {
      if (!fs3.statSync(target).isFile()) target = path3.join(root, "index.html");
    } catch {
      if (path3.extname(rel2)) return send(res, 404, { error: "not found" });
      target = path3.join(root, "index.html");
    }
    const ext = path3.extname(target);
    res.writeHead(200, {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=3600",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...ext === ".html" ? {
        "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data:; media-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        "x-frame-options": "DENY"
      } : {}
    });
    fs3.createReadStream(target).pipe(res);
  }
};
function send(res, status, body) {
  if (res.headersSent) return void res.end();
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  });
  res.end(text);
}
function writeEvent(res, name, data) {
  res.write(`event: ${name}
data: ${JSON.stringify(data)}

`);
}
function readBody(req, limit) {
  return new Promise((resolve) => {
    const declared = Number(req.headers["content-length"] ?? 0);
    if (declared > limit) {
      req.resume();
      return resolve(void 0);
    }
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        req.destroy();
        resolve(void 0);
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => resolve(void 0));
  });
}
function safeEqual(a, b) {
  if (!a || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// packages/daemon/src/main.ts
function arg(name) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : void 0;
}
var flag = (name) => process.argv.includes("--" + name);
var here = path4.dirname(fileURLToPath(import.meta.url));
var f = files(arg("data") ? path4.resolve(arg("data")) : void 0);
fs4.mkdirSync(f.dir, { recursive: true, mode: 448 });
var logStream = fs4.createWriteStream(f.log, { flags: "a" });
var log = (m) => {
  const line = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${m}
`;
  logStream.write(line);
  if (process.stdout.isTTY || flag("verbose")) process.stdout.write(line);
};
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
function health(port) {
  return new Promise((resolve) => {
    const req = http3.get({ host: "127.0.0.1", port, path: "/health", timeout: 400 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
  });
}
async function acquireLock() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs4.openSync(f.lock, "wx", 384);
      fs4.writeSync(fd, String(process.pid));
      fs4.closeSync(fd);
      return true;
    } catch {
      let pid = 0;
      try {
        pid = Number(fs4.readFileSync(f.lock, "utf8")) || 0;
      } catch {
      }
      let info;
      try {
        info = JSON.parse(fs4.readFileSync(f.daemon, "utf8"));
      } catch {
      }
      if (pid && alive(pid) && info && info.pid === pid && await health(info.port)) return false;
      if (pid && alive(pid) && !info) {
        await new Promise((r) => setTimeout(r, 800));
        if (fs4.existsSync(f.daemon)) return false;
      }
      try {
        fs4.unlinkSync(f.lock);
      } catch {
      }
    }
  }
  return false;
}
function loadToken() {
  try {
    const t2 = fs4.readFileSync(f.token, "utf8").trim();
    if (t2.length >= 20) return t2;
  } catch {
  }
  const t = crypto.randomBytes(18).toString("base64url");
  fs4.writeFileSync(f.token, t, { mode: 384 });
  return t;
}
async function main() {
  if (!await acquireLock()) {
    log("another daemon is already running; exiting");
    process.exit(0);
  }
  const config = loadConfig(f.config);
  const token = loadToken();
  const webDir = arg("web") ? path4.resolve(arg("web")) : path4.join(here, "web");
  let demo;
  const daemon = new OfficeDaemon({
    token,
    webDir,
    journalFile: f.journal,
    configFile: f.config,
    config,
    extraOrigins: (process.env.AO_DEV_ORIGIN ?? "").split(",").filter(Boolean),
    log,
    setDemo: (on) => {
      if (on && !demo) {
        demo = new DemoGenerator((ev) => daemon.ingest(ev, false), { agents: Number(arg("agents")) || 9, pace: Number(arg("pace")) || 1 });
        demo.start();
      } else if (!on && demo) {
        demo.stop();
        demo = void 0;
      }
      daemon.demo = !!demo;
      return daemon.demo;
    }
  });
  const restored = daemon.store.restore();
  const spooled = daemon.ingest(drainSpool(f.spool));
  log(`restored ${restored} events from journal, ${spooled.length} from spool`);
  const wanted = arg("port") !== void 0 ? Number(arg("port")) : config.port;
  let port;
  try {
    port = await daemon.listen(wanted);
  } catch {
    port = await daemon.listen(0);
  }
  const info = { pid: process.pid, port, token, startedAt: Date.now(), version: VERSION, demo: flag("demo") };
  const tmp = f.daemon + ".tmp";
  fs4.writeFileSync(tmp, JSON.stringify(info), { mode: 384 });
  fs4.renameSync(tmp, f.daemon);
  log(`listening on http://127.0.0.1:${port}/ (web: ${fs4.existsSync(webDir) ? webDir : "not built"})`);
  const spoolTimer = setInterval(() => {
    const ev = drainSpool(f.spool);
    if (ev.length) daemon.ingest(ev);
  }, 1500);
  if (flag("demo")) daemon.opts_setDemo(true);
  let relay;
  const relayUrl = process.env.AO_RELAY_URL || config.relayUrl;
  const relayToken = process.env.AO_RELAY_TOKEN || config.relayToken;
  if (relayUrl && relayToken) {
    relay = new RelayClient(daemon, relayUrl, relayToken);
    relay.start();
    log(`subscribed to relay ${new URL(relayUrl).host}`);
  }
  const shutdown = async () => {
    clearInterval(spoolTimer);
    demo?.stop();
    relay?.stop();
    try {
      const cur = JSON.parse(fs4.readFileSync(f.daemon, "utf8"));
      if (cur.pid === process.pid) fs4.unlinkSync(f.daemon);
    } catch {
    }
    try {
      if (Number(fs4.readFileSync(f.lock, "utf8")) === process.pid) fs4.unlinkSync(f.lock);
    } catch {
    }
    await daemon.close().catch(() => void 0);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGHUP", shutdown);
}
main().catch((e) => {
  log("fatal: " + e.stack);
  process.exit(1);
});
