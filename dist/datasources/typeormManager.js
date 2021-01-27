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
        debug('Solicitação de conexão recebida');
        let conn;
        if (connectionManager.has(name) && (conn = connectionManager.get(name)).isConnected) {
            debug('Entregando conexão anteriormente realizada');
            return Promise.resolve(conn);
        }
        else {
            debug('Efetuando nova conexão');
            const ormConfig = Object.assign({}, config);
            ormConfig.name = name;
            for (const entity of this.entities) {
                ormConfig.entities.push(entity);
            }
            conn = connectionManager.create(ormConfig);
            try {
                conn = await conn.connect();
                debug('Conexão realizada');
                return Promise.resolve(conn);
            }
            catch (error) {
                debug('Erro na tentativa de conexão');
                throw error;
            }
        }
    }
    static async close(name) {
        debug('Finalizando conexão');
        try {
            if (connectionManager.get(name).isConnected) {
                await connectionManager.get(name).close();
                debug('Conexão finalizada');
            }
        }
        catch (error) {
            debug('Erro ao finalizar a conexão');
            throw error;
        }
    }
    static getConnection(name) {
        return connectionManager.has(name)
            ? connectionManager.get(name)
            : undefined;
    }
    static async wait(config) {
        if (TypeOrmManager.getConnection(config.defaultName) && TypeOrmManager.getConnection(config.defaultName).isConnected) {
            await node_util_module_1.default.delay100ms();
            debug('Aguardando finalização da conexão.');
            return this.wait(config);
        }
        else {
            debug('Conexão finalizada. Prosseguindo...');
            return Promise.resolve();
        }
    }
}
TypeOrmManager.entities = [];
exports.default = TypeOrmManager;
