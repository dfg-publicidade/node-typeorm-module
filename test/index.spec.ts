import { expect } from 'chai';
import { after, describe, it } from 'mocha';
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
    let connection: Connection;

    const options: any = {
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

    after(async (): Promise<void> => {
        if (connection && connection.isConnected) {
            connection.close();
        }
    });

    it('1. connect', async (): Promise<void> => {
        connection = await TypeOrmManagerTest.connect(options, options.name);

        expect(connection).to.exist;
        expect(connection.isConnected).to.be.true;
    });

    it('2. connect', async (): Promise<void> => {
        connection = await TypeOrmManagerTest.connect(options, options.name);

        expect(connection).to.exist;
        expect(connection.isConnected).to.be.true;
    });

    it('3. connect', async (): Promise<void> => {
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

    it('4. getConnection', async (): Promise<void> => {
        const connection: Connection = TypeOrmManagerTest.getConnection(connectionName);

        expect(connection).to.exist;
        expect(connection.isConnected).to.be.true;
    });

    it('5. getConnection', async (): Promise<void> => {
        const connection: Connection = TypeOrmManagerTest.getConnection('invalid');

        expect(connection).to.not.exist;
    });

    it('6. close', async (): Promise<void> => {
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

    it('7. close', async (): Promise<void> => {
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

    it('8. close', async (): Promise<void> => {
        await TypeOrmManagerTest.close(connectionName);
    });
});
