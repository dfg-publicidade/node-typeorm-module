import { Connection, ObjectType, Repository } from 'typeorm';
import TypeOrmManager from '../datasources/typeOrmManager';
import JoinType from '../enums/joinType';

/* Module */
abstract class Service<T> {
    public deletedAtField: string = 'deleted_at';

    protected defaultSorting: any = {};

    protected parentEntities: {
        /**
         * Tipo da junção
         * innerJoin, innerJoinAndSelect, leftJoin, leftJoinAndSelect
         */
        joinType?: JoinType;
        /** 
         * Nome de junção (nome do campo na entidade atual)
         * aluno, trabalho, usuario
         */
        name: string;
        /**
         * Alias da junção (alias que será utilizado na montagem da consulta)
         * Aluno, Trabalho, Usuario
         */
        alias: string;
        /**
         * Serviço de dados da entidade
         * AlunoService, TrabalhoService, UsuarioService
         */
        service: any;
        /**
         * Indicador de dependência (serão feitas as consultas padrão da entidade relacionada)
         * Aluno -> Usuário
         */
        dependent?: boolean;
        /**
         * Subitens que devem ser obrigatoriamente selecionados
         */
        subitems?: string[];
        /**
         * Restringe as entidades pai da entidade que está sendo incluída a lista informada
         */
        only?: string[];
    }[] = [];

    protected childEntities: {
        /**
         * Tipo da junção
         * innerJoin, innerJoinAndSelect, leftJoin, leftJoinAndSelect
         */
        joinType?: JoinType;
        /** 
         * Nome de junção (nome do campo na entidade atual)
         * alunos, trabalhos, usuarios
         */
        name: string;
        /**
         * Alias da junção (alias que será utilizado na montagem da consulta)
         * Aluno, Trabalho, Usuario
         */
        alias: string;
        /**
         * Serviço de dados da entidade
         * AlunoService, TrabalhoService, UsuarioService
         */
        service: any;
        /**
         * Filtros adionais do subitem
         */
        andWhere?: string;
        /**
         * Subitens da junção
         */
        subitems?: string[];
        /**
         * Restringe as entidades filho da entidade que está sendo incluída a lista informada
         */
        only?: string[];
    }[] = [];

    private repositoryType: ObjectType<T>;
    private connectionName: string;

    protected constructor(repositoryType: ObjectType<T>, connectionName: string) {
        this.repositoryType = repositoryType;
        this.connectionName = connectionName;
    }

    public setJoins(alias: string, qb: any, options?: {
        origin?: string;
        joinType?: JoinType;
        subitems?: string[];
        ignore?: string[];
        only?: string[];
    }, andWhere?: any): void {
        const joinType: JoinType = options && options.joinType ? options.joinType : 'innerJoinAndSelect';

        for (const parent of this.parentEntities) {
            if (options && options.only && options.only.indexOf(parent.name) === -1) {
                break;
            }
            if (options && options.ignore && options.ignore.indexOf(alias + parent.alias) !== -1) {
                continue;
            }

            if (!options || !options.origin || parent.name !== options.origin && !parent.alias.endsWith(options.origin)) {
                let andWhereParam: string;
                let andWhereParamValue: any;

                if (andWhere) {
                    for (const andWhereKey of Object.keys(andWhere)) {
                        if (`${alias}.${parent.name}` === andWhereKey) {
                            const andWhereValue: [string, any] = andWhere[andWhereKey];
                            andWhereParam = andWhereValue[0];
                            andWhereParamValue = andWhereValue[1];
                        }
                    }
                }

                let parentJoinType: JoinType = joinType;

                if (parentJoinType === 'innerJoinAndSelect' && parent.joinType) {
                    parentJoinType = parent.joinType;
                }

                qb[parentJoinType](`${alias}.${parent.name}`, alias + parent.alias, andWhereParam, andWhereParamValue, {
                    joinType: parentJoinType
                });

                parent.service.getInstance(this.connectionName).setJoins(alias + parent.alias, qb, {
                    joinType: parentJoinType,
                    subitems: parent.subitems,
                    ignore: options && options.ignore ? options.ignore : undefined,
                    only: parent.only
                }, andWhere);
            }
        }

        if (options && options.subitems) {
            for (const subitem of options.subitems) {
                for (const child of this.childEntities) {
                    if (options && options.only && options.only.indexOf(child.name) === -1) {
                        break;
                    }
                    if (options && options.ignore && options.ignore.indexOf(alias + child.alias) !== -1) {
                        continue;
                    }

                    if (child.name === subitem) {
                        const childJoinType: JoinType = joinType && (joinType === 'leftJoin' || joinType === 'leftJoinAndSelect') ? joinType :
                            child.joinType ? child.joinType : 'leftJoinAndSelect';

                        const childService: Service<any> = child.service.getInstance(this.connectionName);

                        let andWhereParam: string;
                        let andWhereParamValue: any;

                        if (andWhere) {
                            for (const andWhereKey of Object.keys(andWhere)) {
                                if (`${alias}.${child.name}` === andWhereKey) {
                                    const andWhereValue: [string, any] = andWhere[andWhereKey];
                                    andWhereParam = andWhereValue[0];
                                    andWhereParamValue = andWhereValue[1];
                                }
                            }
                        }

                        let where: string = '';

                        if (childService.deletedAtField) {
                            where = `${alias}${child.alias}.${childService.deletedAtField} IS NULL `;
                        }

                        if (child.andWhere) {
                            where += where ? `AND ${child.andWhere} ` : ` ${child.andWhere} `;
                        }

                        if (andWhereParam) {
                            where += where ? `AND ${andWhereParam}` : ` ${andWhereParam} `;
                        }

                        qb[childJoinType](
                            `${alias}.${child.name}`,
                            alias + child.alias,
                            where, andWhereParamValue);

                        childService.setJoins(alias + child.alias, qb, {
                            origin: alias,
                            joinType: child.joinType === 'leftJoin' ? child.joinType : 'leftJoinAndSelect',
                            subitems: child.subitems,
                            ignore: options && options.ignore ? options.ignore : undefined,
                            only: child.only
                        }, andWhere);
                    }
                }
            }
        }
    }

    public setDefaultQuery(alias: string, qb: any): void {
        if (this.deletedAtField) {
            qb.andWhere(`${alias}.${this.deletedAtField} IS NULL`);
        }

        for (const parent of this.parentEntities) {
            if (parent.dependent) {
                parent.service.getInstance(this.connectionName).setDefaultQuery(alias + parent.alias, qb);
            }
        }
    }

    public getSorting(alias: string, options?: {
        origin?: string;
        sort?: any;
        subitems?: string[];
        ignore?: string[];
        only?: string[];
    }): any {
        let sort: any = {};

        if (!options || !options.sort || Object.keys(options.sort).length === 0) {
            for (const key of Object.keys(this.defaultSorting)) {
                sort[key.replace('$alias', alias)] = this.defaultSorting[key];
            }

            for (const parent of this.parentEntities) {
                if (!options || !options.origin || parent.name !== options.origin && !parent.alias.endsWith(options.origin)) {
                    if (options && options.only && options.only.indexOf(parent.name) === -1) {
                        break;
                    }
                    if (options && options.ignore && options.ignore.indexOf(alias + parent.alias) !== -1) {
                        continue;
                    }

                    if (!options || !options.origin || parent.name !== options.origin && !parent.alias.endsWith(options.origin)) {
                        sort = {
                            ...sort,
                            ...parent.service.getInstance(this.connectionName).getSorting(alias + parent.alias, {
                                ignore: options ? options.ignore : undefined,
                                only: parent.only
                            })
                        };
                    }
                }
            }

            if (options && options.subitems) {
                for (const subitem of options.subitems) {
                    for (const child of this.childEntities) {
                        if (options && options.only && options.only.indexOf(child.name) === -1) {
                            break;
                        }
                        if (options && options.ignore && options.ignore.indexOf(alias + child.alias) !== -1) {
                            continue;
                        }

                        if (child.name === subitem) {
                            sort = {
                                ...sort,
                                ...child.service.getInstance(this.connectionName).getSorting(alias + child.alias, {
                                    origin: alias,
                                    ignore: options && options.ignore ? options.ignore : undefined,
                                    only: child.only
                                })
                            };
                        }
                    }
                }
            }
        }
        else {
            const parsedSort: any = {};

            for (const key of Object.keys(options.sort)) {
                parsedSort[this.translateParams(key)] = options.sort[key];
            }

            sort = parsedSort;
        }

        return sort;
    }

    public translateParams(param: string, alias?: string): string {
        if (!param) {
            return '';
        }
        else if (param.indexOf('.') === -1) {
            return param;
        }
        else {
            const field: string = param.substring(0, param.indexOf('.'));
            const compl: string = param.substring(param.indexOf('.') + 1);

            alias = alias ? alias : field;

            if (compl.indexOf('.') !== -1) {
                const subfield: string = compl.substring(0, compl.indexOf('.'));

                for (const parent of this.parentEntities) {
                    if (parent.name === subfield) {
                        const result: string = parent.service.getInstance(this.connectionName).translateParams(compl, parent.alias);

                        return result ? alias + result : undefined;
                    }
                }

                for (const child of this.childEntities) {
                    if (child.name === subfield) {
                        const result: string = child.service.getInstance(this.connectionName).translateParams(compl, child.alias);

                        return result ? alias + result : undefined;
                    }
                }

                return undefined;
            }
            else {
                return `${alias}.${compl}`;
            }
        }
    }

    public getRepository(): Repository<T> {
        const connection: Connection = TypeOrmManager.getConnection(this.connectionName);
        const repository: Repository<T> = connection && connection.isConnected
            ? connection.getRepository(this.repositoryType)
            : undefined;

        if (!connection || !connection.isConnected || !repository) {
            throw new Error('Connection or repository not found');
        }
        else {
            return repository;
        }
    }
}

export default Service;
