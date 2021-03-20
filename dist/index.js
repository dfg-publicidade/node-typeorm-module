"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultService = exports.TypeOrmManager = void 0;
const typeOrmManager_1 = __importDefault(require("./datasources/typeOrmManager"));
exports.TypeOrmManager = typeOrmManager_1.default;
const defaultService_1 = __importDefault(require("./services/defaultService"));
exports.DefaultService = defaultService_1.default;
