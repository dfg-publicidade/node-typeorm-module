import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import { Connection, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TypeOrmManager } from '../src';

/* Tests */
@Entity({
    name: 'Test'
})
export default class Test {
    @PrimaryGeneratedColumn()
    public id: number;
}

class TypeOrmManagerTest extends TypeOrmManager {
    protected static entities: any[] = [
        Test
    ];
}

describe('TypeOrmManager', (): void => {
    const connectionName: string = 'mysql';
    let options: any;
    let connection: Connection;

    before(async (): Promise<void> => {
        if (!process.env.MYSQL_TEST_HOST) {
            throw new Error('MYSQL_TEST_HOST must be set');
        }
        if (!process.env.MYSQL_TEST_USER) {
            throw new Error('MYSQL_TEST_USER must be set');
        }
        if (!process.env.MYSQL_TEST_PASSWORD) {
            throw new Error('MYSQL_TEST_PASSWORD must be set');
        }
        if (!process.env.MYSQL_TEST_DB) {
            throw new Error('MYSQL_TEST_DB must be set');
        }

        options = {
            disabled: false,
            type: 'mysql',
            name: connectionName,
            host: process.env.MYSQL_TEST_HOST,
            port: 3306,
            username: process.env.MYSQL_TEST_USER,
            password: process.env.MYSQL_TEST_PASSWORD,
            database: process.env.MYSQL_TEST_DB,
            timezone: 'local',
            pool: {
                min: 0,
                max: 1
            },
            entities: [],
            synchronize: false
        };
    });

    after(async (): Promise<void> => {
        if (connection && connection.isConnected) {
            connection.close();
        }
    });

    it('1. connect', async (): Promise<void> => {
        let connectionError;
        try {
            await TypeOrmManagerTest.connect(undefined, options.name);
        }
        catch (err) {
            connectionError = err;
        }

        expect(connectionError).to.exist;
        expect(connectionError.message).to.contain('Connection config. was not provided.');
    });

    it('2. connect', async (): Promise<void> => {
        let connectionError;
        try {
            await TypeOrmManagerTest.connect(options, undefined);
        }
        catch (err) {
            connectionError = err;
        }

        expect(connectionError).to.exist;
        expect(connectionError.message).to.contain('Connection name was not provided.');
    });

    it('3. connect', async (): Promise<void> => {
        connection = await TypeOrmManagerTest.connect(options, options.name);

        expect(connection).to.exist;
        expect(connection.isConnected).to.be.true;
    });

    it('4. connect', async (): Promise<void> => {
        connection = await TypeOrmManagerTest.connect(options, options.name);

        expect(connection).to.exist;
        expect(connection.isConnected).to.be.true;
    });

    it('5. connect', async (): Promise<void> => {
        let connectionError: any;
        try {
            await TypeOrmManagerTest.connect({
                ...options,
                name: 'fail',
                password: ''
            }, 'fail');
        }
        catch (error: any) {
            connectionError = error;
        }

        expect(connectionError).to.exist;
        expect(connectionError.message).to.contain('ER_ACCESS_DENIED_ERROR');
    });

    it('6. getConnection', async (): Promise<void> => {
        expect(() => {
            TypeOrmManagerTest.getConnection(undefined);
        }).to.throw('Connection name was not provided.');
    });

    it('7. getConnection', async (): Promise<void> => {
        const connection: Connection = TypeOrmManagerTest.getConnection(connectionName);

        expect(connection).to.exist;
        expect(connection.isConnected).to.be.true;
    });

    it('8. getConnection', async (): Promise<void> => {
        const connection: Connection = TypeOrmManagerTest.getConnection('invalid');

        expect(connection).to.not.exist;
    });

    it('9. close', async (): Promise<void> => {
        let connectionError: any;
        try {
            await TypeOrmManagerTest.close(undefined);
        }
        catch (error: any) {
            connectionError = error;
        }

        expect(connectionError).to.exist;
        expect(connectionError.message).to.contain('Connection name was not provided.');
    });

    it('10. close', async (): Promise<void> => {
        TypeOrmManagerTest.wait({
            name: connectionName
        });

        await TypeOrmManagerTest.close(connectionName);

        await TypeOrmManagerTest.wait({
            name: connectionName
        });

        expect(connection).to.exist;
        expect(connection.isConnected).to.be.false;
    });

    it('11. close', async (): Promise<void> => {
        let connectionError: any;
        try {
            await TypeOrmManagerTest.close('invalid');
        }
        catch (error: any) {
            connectionError = error;
        }

        expect(connectionError).to.exist;
        expect(connectionError.message).to.contain('Connection "invalid" was not found');
    });

    it('12. close', async (): Promise<void> => {
        await TypeOrmManagerTest.close(connectionName);
    });

    it('13. wait', async (): Promise<void> => {
        let connectionError: any;
        try {
            await TypeOrmManagerTest.wait(undefined);
        }
        catch (error: any) {
            connectionError = error;
        }

        expect(connectionError).to.exist;
        expect(connectionError.message).to.contain('Config. was not provided.');
    });
});
