import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import { Column, Connection, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, SelectQueryBuilder } from 'typeorm';
import { DefaultService, JoinType, TypeOrmManager } from '../../src';

/* Tests */
@Entity({
    name: 'Test'
})
class Test {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({
        type: 'varchar'
    })
    public name: string;

    @Column({
        name: 'created_at',
        type: 'datetime'
    })
    public createdAt: Date;

    @Column({
        name: 'updated_at',
        type: 'datetime'
    })
    public updatedAt: Date;

    @Column({
        name: 'deleted_at',
        type: 'datetime'
    })
    public deletedAt: Date;

    @OneToMany((type: Test2): any => Test2, (test2: Test2): Test => test2.test)
    public tests: Test2[];

    @OneToMany((type: Test2): any => Test2, (test2: Test2): Test => test2.testB)
    public testsB: Test2[];
}

@Entity({
    name: 'Test2'
})
class Test2 {
    @PrimaryGeneratedColumn()
    public id: number;

    @ManyToOne((type: Test): any => Test, (test: Test): Test2[] => test.tests)
    @JoinColumn({ name: 'test', referencedColumnName: 'id' })
    public test: Test;

    @ManyToOne((type: Test): any => Test, (test: Test): Test2[] => test.testsB)
    @JoinColumn({ name: 'testB', referencedColumnName: 'id' })
    public testB: Test;

    @Column({
        name: 'deleted_at',
        type: 'datetime'
    })
    public deletedAt: Date;

    @OneToMany((type: Test3): any => Test3, (test3: Test3): Test2 => test3.test)
    public tests: Test3[];
}

@Entity({
    name: 'Test3'
})
class Test3 {
    @PrimaryGeneratedColumn()
    public id: number;

    @ManyToOne((type: Test2): any => Test2, (test: Test2): Test3[] => test.tests)
    @JoinColumn({ name: 'test', referencedColumnName: 'id' })
    public test: Test2;
}

class TypeOrmManagerTest extends TypeOrmManager {
    protected static entities: any[] = [
        Test,
        Test2,
        Test3
    ];
}

class TestService extends DefaultService<Test> {
    private static instances: TestService;

    protected defaultSorting: any = {
        '$alias.name': 'ASC'
    };

    private constructor(connectionName: string) {
        super(Test, connectionName);

        this.parentEntities = [];

        this.childEntities = [{
            name: 'tests',
            alias: 'Test2',
            service: TestService2
        }, {
            name: 'testsB',
            alias: 'Test2',
            service: TestService2
        }];
    }

    public static getInstance(connectionName: string): TestService {
        let instance: TestService = this.instances;

        if (!instance) {
            instance = new TestService(connectionName);
            this.instances = instance;
        }

        return instance;
    }

    public setChildJoinType(joinType: JoinType): void {
        this.childEntities[0].joinType = joinType;
    }

    public deleteChildJoinType(): void {
        delete this.childEntities[0].joinType;
    }

    public setAndWhere(andWhere: string): void {
        this.childEntities[0].andWhere = andWhere;
    }

    public deleteAndWhere(): void {
        delete this.childEntities[0].andWhere;
    }

    public setDeletedField(deletedAtField: string): void {
        this.deletedAtField = deletedAtField;
    }
}

class TestService2 extends DefaultService<Test2> {
    private static instance: TestService2;

    public deletedAtField: string = undefined;

    private constructor(connectionName: string) {
        super(Test2, connectionName);

        this.parentEntities = [{
            name: 'test',
            alias: 'Test',
            service: TestService
        }, {
            name: 'testB',
            alias: 'TestB',
            service: TestService,
            joinType: 'innerJoinAndSelect'
        }];

        this.childEntities = [];
    }

    public static getInstance(connectionName: string): TestService2 {
        let instance: TestService2 = this.instance;

        if (!instance) {
            instance = new TestService2(connectionName);
            this.instance = instance;
        }

        return instance;
    }

    public setDefaultQuery(alias: string, qb: SelectQueryBuilder<any>): void {
        super.setDefaultQuery(alias, qb);

        qb.andWhere(`${alias}.id > 0`);

        qb.orderBy(`${alias}.id`, 'DESC');
    }

    public setDefaultSorting(sort: any): void {
        this.defaultSorting = sort;
    }

    public setDeletedAtField(deletedAtField: string): void {
        this.deletedAtField = deletedAtField;
    }

    public setParentJoinType(joinType: JoinType): void {
        this.parentEntities[0].joinType = joinType;
        this.parentEntities[1].joinType = joinType;
    }

    public deleteParentJoinType(): void {
        delete this.parentEntities[0].joinType;
        delete this.parentEntities[1].joinType;
    }

    public addParent(item: any): void {
        this.parentEntities.push(item);
    }

    public removeParent(): void {
        this.parentEntities.pop();
    }

    public setDependent(dependent: boolean): void {
        this.parentEntities[0].dependent = dependent;
    }
}

class TestService3 extends DefaultService<Test3> {
    private constructor(connectionName: string) {
        super(Test3, connectionName);

        this.parentEntities = [{
            name: 'test',
            alias: 'Test2',
            service: TestService2
        }];

        this.childEntities = [];
    }

    public static getInstance(connectionName: string): TestService3 {
        return new TestService3(connectionName);
    }
}

class TestServiceB extends DefaultService<Test> {
    private constructor(connectionName: string) {
        super(Test, connectionName);
    }

    public static getInstance(connectionName: string): TestServiceB {
        return new TestServiceB(connectionName);
    }
}

class TestServiceFail extends DefaultService<Test> {
    private constructor(connectionName: string) {
        super(undefined, connectionName);
    }

    public static getInstance(connectionName: string): TestServiceFail {
        return new TestServiceFail(connectionName);
    }
}

describe('DefaultService', (): void => {
    const connectionName: string = 'mysql';
    let connection: Connection;

    let testService: TestService;
    let testService2: TestService2;
    let testService3: TestService3;

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

    before(async (): Promise<void> => {
        connection = await TypeOrmManagerTest.connect(options, connectionName);

        await connection.manager.query(`
            CREATE TABLE IF NOT EXISTS Test (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(10),
                created_at DATE,
                updated_at DATE,
                deleted_at DATE
            )
        `);
        await connection.manager.query(`
            CREATE TABLE IF NOT EXISTS Test2 (
                id INT PRIMARY KEY AUTO_INCREMENT,
                test INT,
                testB INT,
                deleted_at DATE,
                CONSTRAINT FOREIGN KEY (test) REFERENCES Test(id),
                CONSTRAINT FOREIGN KEY (testB) REFERENCES Test(id)
            )
        `);
        await connection.manager.query(`
            CREATE TABLE IF NOT EXISTS Test3 (
                id INT PRIMARY KEY AUTO_INCREMENT,
                test INT,
                CONSTRAINT FOREIGN KEY (test) REFERENCES Test2(id)
            )
        `);

        await connection.manager.query(`
            INSERT INTO Test(name) VALUES ('test')
        `);
        await connection.manager.query(`
            INSERT INTO Test2(test, testB) VALUES (1, 1)
        `);
        await connection.manager.query(`
            INSERT INTO Test3(test) VALUES (1)
        `);
    });

    after(async (): Promise<void> => {
        await connection.manager.query('DROP TABLE Test3');
        await connection.manager.query('DROP TABLE Test2');
        await connection.manager.query('DROP TABLE Test');

        await TypeOrmManagerTest.close(options.name);
    });

    it('1. constructor', async (): Promise<void> => {
        expect(() => {
            TestServiceFail.getInstance(undefined);
        }).to.throw('Repository type was not provided.');
    });

    it('2. constructor', async (): Promise<void> => {
        expect(() => {
            TestService.getInstance(undefined);
        }).to.throw('Connection name was not provided.');
    });

    it('3. constructor', async (): Promise<void> => {
        testService = TestService.getInstance(connectionName);
        testService2 = TestService2.getInstance(connectionName);
        testService3 = TestService3.getInstance(connectionName);

        expect(testService).to.exist;
        expect(testService2).to.exist;
        expect(testService3).to.exist;
    });

    it('4. getRepository', async (): Promise<void> => {
        let connectionError: any;
        try {
            await TestServiceB.getInstance('invalid').getRepository().query('SELECT 1');
        }
        catch (error: any) {
            connectionError = error;
        }

        expect(connectionError).to.exist;
        expect(connectionError.message).to.contain('Connection or repository not found');
    });

    it('5. getRepository', async (): Promise<void> => {
        expect((await testService.getRepository().query('SELECT 1 AS result'))[0].result).to.be.eq('1');
    });

    it('6. translateParams', async (): Promise<void> => {
        expect(testService.translateParams(undefined)).to.be.undefined;
    });

    it('7. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2')).to.be.eq('test2');
    });

    it('8. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.id')).to.be.eq('test2.id');
    });

    it('9. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.test.id')).to.be.eq('test2Test.id');
    });

    it('10. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.invalid.id')).to.be.undefined;
    });

    it('11. translateParams', async (): Promise<void> => {
        expect(testService2.translateParams('test2.test.invalid.id')).to.be.undefined;
    });

    it('12. translateParams', async (): Promise<void> => {
        expect(testService.translateParams('test.tests.id')).to.be.eq('testTest2.id');
    });

    it('13. translateParams', async (): Promise<void> => {
        expect(testService.translateParams('test.tests.invalid.id')).to.be.undefined;
    });

    it('14. setDefaultQuery', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        expect(() => {
            testService.setDefaultQuery(undefined, qb);
        }).to.throw('Alias was not provided.');
    });

    it('15. setDefaultQuery', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        expect(() => {
            testService.setDefaultQuery(test, undefined);
        }).to.throw('Query builder was not provided.');
    });

    it('16. setDefaultQuery', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setDefaultQuery(test, qb);

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name',
            '${test}'.'created_at' AS '${test}_created_at',
            '${test}'.'updated_at' AS '${test}_updated_at',
            '${test}'.'deleted_at' AS '${test}_deleted_at' 
            FROM 'Test' '${test}' 
            WHERE '${test}'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('17. setDefaultQuery', async (): Promise<void> => {
        const test2: string = 'test2';

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setDefaultQuery(test2, qb);

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id',
            '${test2}'.'deleted_at' AS '${test2}_deleted_at',
            '${test2}'.'test'       AS '${test2}_test',
            '${test2}'.'testB'      AS '${test2}_testB' 
            FROM 'Test2' '${test2}' 
            WHERE '${test2}'.'id' > 0
            ORDER BY 'test2'.'id' DESC
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('18. getSorting', async (): Promise<void> => {
        expect(() => {
            testService.getSorting(undefined, {})
        }).to.throw('Alias was not provided.');
    });

    it('19. getSorting', async (): Promise<void> => {
        expect(testService.getSorting('test', {
            sort: {
                'test.name': 'ASC'
            }
        })).to.be.deep.eq({
            'test.name': 'ASC'
        });
    });

    it('20. getSorting', async (): Promise<void> => {
        expect(testService.getSorting('test', {})).to.be.deep.eq({
            'test.name': 'ASC'
        });
    });

    it('21. getSorting', async (): Promise<void> => {
        expect(testService2.getSorting('test2', {})).to.be.deep.eq({});
    });

    it('22. getSorting', async (): Promise<void> => {
        expect(testService2.getSorting('test2', {
            ignore: ['test2Test']
        })).to.be.deep.eq({});
    });

    it('23. getSorting', async (): Promise<void> => {
        testService2.setDefaultSorting({
            '$alias.title': 'ASC'
        });

        expect(testService.getSorting('test', {
            subitems: ['tests', 'others']
        })).to.be.deep.eq({
            'test.name': 'ASC',
            'testTest2.title': 'ASC'
        });

        testService2.setDefaultSorting({});
    });

    it('24. getSorting', async (): Promise<void> => {
        testService2.setDefaultSorting({
            '$alias.title': 'ASC'
        });

        expect(testService.getSorting('test', {
            subitems: ['tests', 'others'],
            ignore: ['others']
        })).to.be.deep.eq({
            'test.name': 'ASC',
            'testTest2.title': 'ASC'
        });

        testService2.setDefaultSorting({});
    });

    it('25. getSorting', async (): Promise<void> => {
        testService2.setDefaultSorting({
            '$alias.title': 'ASC'
        });

        expect(testService2.getSorting('test2', {
            only: ['testB']
        })).to.be.deep.eq({
            'test2.title': 'ASC'
        });

        testService2.setDefaultSorting({});
    });

    it('26. getSorting', async (): Promise<void> => {
        expect(testService.getSorting('test', {
            subitems: ['tests'],
            only: ['tests2']
        })).to.be.deep.eq({
            'test.name': 'ASC'
        });
    });

    it('27. getSorting', async (): Promise<void> => {
        expect(testService.getSorting('test', {
            subitems: ['tests'],
            ignore: ['testTest2']
        })).to.be.deep.eq({
            'test.name': 'ASC'
        });
    });

    it('28. getSorting', async (): Promise<void> => {
        expect(testService2.getSorting('test2')).to.be.deep.eq({});
    });

    it('29. setJoins', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        expect(() => {
            testService.setJoins(undefined, qb, {});
        }).to.throw('Alias was not provided.');
    });

    it('30. setJoins', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        expect(() => {
            testService.setJoins(test, undefined, {});
        }).to.throw('Query builder was not provided.');
    });

    it('31. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 
            
            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='${test}'.'id'
                AND ('${test2}'.'id' > 0)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('32. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            joinType: 'innerJoinAndSelect'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            INNER JOIN 'Test2' '${test2}' ON '${test2}'.'test'='${test}'.'id'
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('33. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setChildJoinType('innerJoinAndSelect');

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            INNER JOIN 'Test2' '${test2}' ON '${test2}'.'test'='${test}'.'id'
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.deleteChildJoinType();
    });

    it('34. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService2.setDeletedAtField('deletedAt');

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT 
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('${test2}'.'deleted_at' IS NULL AND 'testTest2'.'id' > 0)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDeletedAtField(undefined);
    });

    it('35. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setAndWhere('`testTest2`.`deleted_at` IS NULL');

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='${test}'.'id'
                AND ('${test2}'.'id' > 0 AND '${test2}'.'deleted_at' IS NULL)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.deleteAndWhere();
    });

    it('36. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService2.setDeletedAtField('deletedAt');
        testService.setAndWhere('`testTest2`.`deleted_at` IS NULL');

        testService.setJoins(test, qb, {
            subitems: ['tests']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('${test2}'.'deleted_at' IS NULL AND '${test2}'.'id' > 0
                AND '${test2}'.'deleted_at' IS NULL)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.deleteAndWhere();
        testService2.setDeletedAtField(undefined);
    });

    it('37. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            ignore: ['other']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}' ON '${test2}'.'test'='test'.'id'
                AND ('${test2}'.'id' > 0)
            LEFT JOIN 'Test'  '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDeletedAtField(undefined);
    });

    it('38. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {
            ignore: ['test2Test']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 
            
            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('39. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {}, {
            'test2.test': [
                'test2Test.id = :id', {
                    id: 1
                }
            ]
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 
            
            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
            AND ('test2Test'.'id' = ?)
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('40. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests']
        }, {
            'test.tests': [
                'testTest2.id = :id', {
                    id: 1
                }
            ]
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 
            
            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}'  ON '${test2}'.'test'='${test}'.'id'
            AND ('${test2}'.'id' > 0 AND '${test2}'.'id' = ?)
            LEFT JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
            AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('41. setJoins', async (): Promise<void> => {
        const test: string = 'test';
        const test2: string = `${test}Test2`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests']
        }, {
            'test.tests2': [
                'testTest2.id = :id', {
                    id: 1
                }
            ]
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 
            
            FROM 'Test' '${test}'
            LEFT JOIN 'Test2' '${test2}'  ON '${test2}'.'test'='${test}'.'id'
            AND ('${test2}'.'id' > 0)
            LEFT JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
            AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('42. setJoins', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            ignore: ['testTest2']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at'
            FROM 'Test' '${test}'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('43. setJoins', async (): Promise<void> => {
        const test: string = 'test';

        const qb: SelectQueryBuilder<Test> = testService.getRepository().createQueryBuilder(test);

        testService.setJoins(test, qb, {
            subitems: ['tests'],
            only: ['other']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at'
            FROM 'Test' '${test}'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('44. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 
            
            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('45. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {
            joinType: 'leftJoinAndSelect'
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            LEFT JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
                AND ('${test}'.'deleted_at' IS NULL)
            LEFT JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
                AND ('${testB}'.'deleted_at' IS NULL)
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('46. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {
            ignore: ['other']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test'
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('47. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb, {
            only: ['other']
        });

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
           '${test2}'.'id'           AS 'test2_id', 
           '${test2}'.'deleted_at'   AS 'test2_deleted_at', 
           '${test2}'.'test'         AS 'test2_test', 
           '${test2}'.'testB'        AS 'test2_testB' 

            FROM 'Test2' '${test2}'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('48. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService.setDeletedField(undefined);

        testService2.setJoins(test2, qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test' 
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService.setDeletedField('deletedAt');
    });

    it('49. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setDependent(true);

        testService2.setJoins(test2, qb, {});

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test' 
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
            WHERE '${test}'.'deleted_at' IS NULL
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);

        testService2.setDependent(false);
    });

    it('50. setJoins', async (): Promise<void> => {
        const test2: string = 'test2';
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test2> = testService2.getRepository().createQueryBuilder(test2);

        testService2.setJoins(test2, qb);

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test2' '${test2}'
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test' 
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });

    it('51. setJoins', async (): Promise<void> => {
        const test3: string = 'test3';
        const test2: string = `${test3}Test2`;
        const test: string = `${test2}Test`;
        const testB: string = `${test2}TestB`;

        const qb: SelectQueryBuilder<Test3> = testService3.getRepository().createQueryBuilder(test3);

        testService3.setJoins(test3, qb);

        expect(qb.getSql().replace(/\s+/ig, ' ')).to.be.eq(`
            SELECT
            '${test3}'.'id'         AS '${test3}_id', 
            '${test3}'.'test'       AS '${test3}_test', 

            '${test2}'.'id'         AS '${test2}_id', 
            '${test2}'.'deleted_at' AS '${test2}_deleted_at', 
            '${test2}'.'test'       AS '${test2}_test', 
            '${test2}'.'testB'      AS '${test2}_testB', 
            
            '${test}'.'id'         AS '${test}_id', 
            '${test}'.'name'       AS '${test}_name', 
            '${test}'.'created_at' AS '${test}_created_at', 
            '${test}'.'updated_at' AS '${test}_updated_at', 
            '${test}'.'deleted_at' AS '${test}_deleted_at', 

            '${testB}'.'id'         AS '${testB}_id', 
            '${testB}'.'name'       AS '${testB}_name', 
            '${testB}'.'created_at' AS '${testB}_created_at', 
            '${testB}'.'updated_at' AS '${testB}_updated_at', 
            '${testB}'.'deleted_at' AS '${testB}_deleted_at' 

            FROM 'Test3' '${test3}'
            INNER JOIN 'Test2' '${test2}'  ON '${test2}'.'id'='${test3}'.'test' 
            INNER JOIN 'Test' '${test}'  ON '${test}'.'id'='${test2}'.'test' 
            INNER JOIN 'Test' '${testB}' ON '${testB}'.'id'='${test2}'.'testB'
        `.replace(/[\r|\n|\t]/ig, '').replace(/\s+/ig, ' ').replace(/'/ig, '`').trim());
        expect(await qb.getCount()).to.be.eq(1);
    });
});
