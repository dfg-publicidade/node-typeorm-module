import Util from '@dfgpublicidade/node-util-module';
import appDebugger from 'debug';
import { Connection, ConnectionManager, getConnectionManager } from 'typeorm';

/* Module */
const debug: appDebugger.IDebugger = appDebugger('module:typeorm-manager');

const connectionManager: ConnectionManager = getConnectionManager();

class TypeOrmManager {
    protected static entities: any[] = [];

    public static async connect(config: any, name: string): Promise<Connection> {
        debug('Solicitação de conexão recebida');

        let conn: Connection;
        if (connectionManager.has(name) && (conn = connectionManager.get(name)).isConnected) {
            debug('Entregando conexão anteriormente realizada');
            return Promise.resolve(conn);
        }
        else {
            debug('Efetuando nova conexão');

            const ormConfig: any = { ...config };
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

    public static async close(name: string): Promise<void> {
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

    public static getConnection(name: string): Connection {
        return connectionManager.has(name)
            ? connectionManager.get(name)
            : undefined;
    }

    public static async wait(config: any): Promise<void> {
        if (TypeOrmManager.getConnection(config.defaultName) && TypeOrmManager.getConnection(config.defaultName).isConnected) {
            await Util.delay100ms();
            debug('Aguardando finalização da conexão.');
            return this.wait(config);
        }
        else {
            debug('Conexão finalizada. Prosseguindo...');
            return Promise.resolve();
        }
    }
}

export default TypeOrmManager;
