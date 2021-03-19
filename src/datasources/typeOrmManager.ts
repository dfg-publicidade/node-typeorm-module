import Util from '@dfgpublicidade/node-util-module';
import appDebugger from 'debug';
import { Connection, ConnectionManager, getConnectionManager } from 'typeorm';

/* Module */
const debug: appDebugger.IDebugger = appDebugger('module:typeorm-manager');

const connectionManager: ConnectionManager = getConnectionManager();

class TypeOrmManager {
    protected static entities: any[] = [];

    public static async connect(config: any, name: string): Promise<Connection> {
        debug('Connection request received ');

        let conn: Connection;
        if (connectionManager.has(name) && (conn = connectionManager.get(name)).isConnected) {
            debug('Delivering previously made connection');
            return Promise.resolve(conn);
        }
        else {
            debug('Making a new connection');

            const ormConfig: any = { ...config };
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

    public static async close(name: string): Promise<void> {
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

    public static getConnection(name: string): Connection {
        return connectionManager.has(name)
            ? connectionManager.get(name)
            : undefined;
    }

    public static async wait(config: any): Promise<void> {
        if (TypeOrmManager.getConnection(config.name) && TypeOrmManager.getConnection(config.name).isConnected) {
            await Util.delay100ms();
            debug('Waiting for connection.');
            return this.wait(config);
        }
        else {
            debug('Connection closed. Proceeding...');
            return Promise.resolve();
        }
    }
}

export default TypeOrmManager;
