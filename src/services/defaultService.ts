import { Connection, ObjectType, Repository, SelectQueryBuilder } from 'typeorm';
import { DefaultService } from '..';
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
        const joinType: JoinType = options && options.joinType ? options.joinType : undefined;

        for (const parent of this.parentEntities) {
            if (options && options.only && options.only.indexOf(parent.name) === -1) {
                break;
            }
            if (options && options.ignore && options.ignore.indexOf(alias + parent.alias) !== -1) {
                continue;
            }

            if (!options || !options.origin || parent.name !== options.origin && !options.origin.endsWith(parent.alias)) {
                const parentService: DefaultService<any> = parent.service.getInstance(this.connectionName);

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

                const parentJoinType: JoinType = joinType ? joinType : 'innerJoinAndSelect';

                const parentQb: SelectQueryBuilder<any> = parentService.getRepository().createQueryBuilder(alias + parent.alias);

                if (!parent.dependent && (parentJoinType === 'leftJoin' || parentJoinType === 'leftJoinAndSelect')) {
                    parentService.setDefaultQuery(alias + parent.alias, parentQb);
                }

                if (andWhereParam) {
                    parentQb.andWhere(andWhereParam);
                }

                const query: any = this.queryToString(parentQb, andWhereParamValue);

                qb[parentJoinType](
                    `${alias}.${parent.name}`,
                    alias + parent.alias,
                    query?.where,
                    query?.params
                );

                parentService.setJoins(alias + parent.alias, qb, {
                    origin: alias,
                    joinType: parentJoinType,
                    subitems: parent.subitems,
                    ignore: options && options.ignore ? options.ignore : undefined,
                    only: parent.only
                }, andWhere);

                if (parent.dependent && (parentJoinType === 'innerJoin' || parentJoinType === 'innerJoinAndSelect')) {
                    parentService.setDefaultQuery(alias + parent.alias, qb);
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
                        const childJoinType: JoinType = joinType && (joinType === 'innerJoin' || joinType === 'innerJoinAndSelect') ? joinType :
                            child.joinType ? child.joinType : 'leftJoinAndSelect';

                        const childService: Service<any> = child.service.getInstance(this.connectionName);

                        const childQb: SelectQueryBuilder<any> = childService.getRepository().createQueryBuilder(alias + child.alias);

                        if (childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect') {
                            childService.setDefaultQuery(alias + child.alias, childQb);
                        }

                        if (child.andWhere) {
                            childQb.andWhere(child.andWhere);
                        }

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

                        if (andWhereParam) {
                            childQb.andWhere(andWhereParam);
                        }

                        const query: any = this.queryToString(childQb, andWhereParamValue);

                        qb[childJoinType](
                            `${alias}.${child.name}`,
                            alias + child.alias,
                            query?.where,
                            query?.params
                        );

                        childService.setJoins(alias + child.alias, qb, {
                            origin: alias,
                            joinType: childJoinType,
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
            for (const parent of this.parentEntities) {
                if (!options || !options.origin || parent.name !== options.origin && !parent.alias.endsWith(options.origin)) {
                    if (options && options.only && options.only.indexOf(parent.name) === -1) {
                        continue;
                    }
                    if (options && options.ignore && options.ignore.indexOf(alias + parent.alias) !== -1) {
                        continue;
                    }

                    sort = {
                        ...sort,
                        ...parent.service.getInstance(this.connectionName).getSorting(alias + parent.alias, {
                            ignore: options?.ignore,
                            only: parent.only
                        })
                    };
                }
            }

            for (const key of Object.keys(this.defaultSorting)) {
                sort[key.replace('$alias', alias)] = this.defaultSorting[key];
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

    private queryToString(qb: SelectQueryBuilder<any>, andWhereParamValue: any): {
        where: string;
        params: any;
    } {
        let where: string = qb.getQuery();

        if (where.indexOf('WHERE') === -1) {
            return undefined;
        }
        else {
            let end: number = where.indexOf('ORDER BY');

            if (end === -1) {
                end = where.indexOf('GROUP BY');
            }

            if (end === -1) {
                end = where.indexOf('LIMIT BY');
            }

            if (end === -1) {
                end = where.length;
            }

            where = where.substring(where.indexOf('WHERE') + 'WHERE'.length, end).trim();

            return {
                where,
                params: andWhereParamValue
            };
        }
    }
}

export default Service;
