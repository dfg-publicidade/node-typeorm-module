"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_util_module_1 = __importDefault(require("@dfgpublicidade/node-util-module"));
const debug_1 = __importDefault(require("debug"));
const typeorm_1 = require("typeorm");
/* Module */
const debug = debug_1.default('module:typeorm-manager');
const connectionManager = typeorm_1.getConnectionManager();
class TypeOrmManager {
    static async connect(config, name) {
        debug('Connection request received ');
        let conn;
        if (connectionManager.has(name) && (conn = connectionManager.get(name)).isConnected) {
            debug('Delivering previously made connection');
            return Promise.resolve(conn);
        }
        else {
            debug('Making a new connection');
            const ormConfig = Object.assign({}, config);
            ormConfig.name = name;
            for (const entity of this.entities) {
                ormConfig.entities.push(entity);
            }
            conn = connectionManager.create(ormConfig);
            try {
                conn = await conn.connect();
                debug('Connection done');
                return Promise.resolve(conn);
            }
            catch (error) {
                debug('Connection attempt error');
                return Promise.reject(error);
            }
        }
    }
    static async close(name) {
        debug('Closing connection');
        try {
            if (connectionManager.get(name).isConnected) {
                await connectionManager.get(name).close();
                debug('Connection closed');
            }
        }
        catch (error) {
            debug('Connection close attempt error');
            throw error;
        }
    }
    static getConnection(name) {
        return connectionManager.has(name)
            ? connectionManager.get(name)
            : undefined;
    }
    static async wait(config) {
        if (TypeOrmManager.getConnection(config.name) && TypeOrmManager.getConnection(config.name).isConnected) {
            await node_util_module_1.default.delay100ms();
            debug('Waiting for connection.');
            return this.wait(config);
        }
        else {
            debug('Connection closed. Proceeding...');
            return Promise.resolve();
        }
    }
}
TypeOrmManager.entities = [];
exports.default = TypeOrmManager;
