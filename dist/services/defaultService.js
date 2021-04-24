"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_strings_module_1 = __importDefault(require("@dfgpublicidade/node-strings-module"));
const typeOrmManager_1 = __importDefault(require("../datasources/typeOrmManager"));
/* Module */
class Service {
    constructor(repositoryType, connectionName) {
        this.deletedAtField = 'deleted_at';
        this.defaultSorting = {};
        this.parentEntities = [];
        this.childEntities = [];
        this.repositoryType = repositoryType;
        this.connectionName = connectionName;
    }
    setJoins(alias, qb, options, andWhere) {
        for (const parent of this.parentEntities) {
            if (options && options.only && options.only.indexOf(parent.name) === -1) {
                break;
            }
            if (options && options.ignore && options.ignore.indexOf(alias + parent.alias) !== -1) {
                continue;
            }
            if (!options || !options.origin || parent.name !== options.origin && !options.origin.endsWith(parent.alias)) {
                const parentService = parent.service.getInstance(this.connectionName);
                let parentJoinType = parent.joinType ? parent.joinType : 'innerJoinAndSelect';
                if ((parentJoinType === 'innerJoin' || parentJoinType === 'innerJoinAndSelect') && (options === null || options === void 0 ? void 0 : options.joinType)) {
                    parentJoinType = options.joinType;
                }
                let andWhereParam;
                let andWhereParamValue;
                if (andWhere) {
                    for (const andWhereKey of Object.keys(andWhere)) {
                        if (`${alias}.${parent.name}` === andWhereKey) {
                            const andWhereValue = andWhere[andWhereKey];
                            andWhereParam = andWhereValue[0];
                            andWhereParamValue = andWhereValue[1];
                        }
                    }
                }
                const parentQb = parentService.getRepository().createQueryBuilder(alias + parent.alias);
                if (!parent.dependent && (parentJoinType === 'leftJoin' || parentJoinType === 'leftJoinAndSelect')) {
                    parentService.setDefaultQuery(alias + parent.alias, parentQb);
                }
                if (andWhereParam) {
                    parentQb.andWhere(andWhereParam);
                }
                const query = this.queryToString(alias + parent.alias, alias, parentQb, andWhereParamValue);
                qb[parentJoinType](`${alias}.${parent.name}`, alias + parent.alias, query === null || query === void 0 ? void 0 : query.where, query === null || query === void 0 ? void 0 : query.params);
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
                        let childJoinType = child.joinType ? child.joinType : 'leftJoinAndSelect';
                        if ((childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect') && options.joinType) {
                            childJoinType = options.joinType;
                        }
                        const childService = child.service.getInstance(this.connectionName);
                        const childQb = childService.getRepository().createQueryBuilder(alias + child.alias);
                        if (childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect') {
                            childService.setDefaultQuery(alias + child.alias, childQb);
                        }
                        if (child.andWhere) {
                            childQb.andWhere(child.andWhere);
                        }
                        let andWhereParam;
                        let andWhereParamValue;
                        if (andWhere) {
                            for (const andWhereKey of Object.keys(andWhere)) {
                                if (`${alias}.${child.name}` === andWhereKey) {
                                    const andWhereValue = andWhere[andWhereKey];
                                    andWhereParam = andWhereValue[0];
                                    andWhereParamValue = andWhereValue[1];
                                }
                            }
                        }
                        if (andWhereParam) {
                            childQb.andWhere(andWhereParam);
                        }
                        const query = this.queryToString(alias + child.alias, alias, childQb, andWhereParamValue);
                        qb[childJoinType](`${alias}.${child.name}`, alias + child.alias, query === null || query === void 0 ? void 0 : query.where, query === null || query === void 0 ? void 0 : query.params);
                        childService.setJoins(alias + child.alias, qb, {
                            origin: alias,
                            joinType: childJoinType === 'leftJoin' || childJoinType === 'leftJoinAndSelect' ? childJoinType : 'leftJoinAndSelect',
                            subitems: child.subitems,
                            ignore: options && options.ignore ? options.ignore : undefined,
                            only: child.only
                        }, andWhere);
                    }
                }
            }
        }
    }
    setDefaultQuery(alias, qb) {
        if (this.deletedAtField) {
            qb.andWhere(`${alias}.${this.deletedAtField} IS NULL`);
        }
    }
    getSorting(alias, options) {
        let sort = {};
        if (!options || !options.sort || Object.keys(options.sort).length === 0) {
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
                            sort = Object.assign(Object.assign({}, sort), child.service.getInstance(this.connectionName).getSorting(alias + child.alias, {
                                origin: alias,
                                ignore: options && options.ignore ? options.ignore : undefined,
                                only: child.only
                            }));
                        }
                    }
                }
            }
        }
        else {
            const parsedSort = {};
            for (const key of Object.keys(options.sort)) {
                parsedSort[this.translateParams(key)] = options.sort[key];
            }
            sort = parsedSort;
        }
        return sort;
    }
    translateParams(param, alias) {
        if (!param) {
            return '';
        }
        else if (param.indexOf('.') === -1) {
            return param;
        }
        else {
            const field = param.substring(0, param.indexOf('.'));
            const compl = param.substring(param.indexOf('.') + 1);
            alias = alias ? alias : field;
            if (compl.indexOf('.') !== -1) {
                const subfield = compl.substring(0, compl.indexOf('.'));
                for (const parent of this.parentEntities) {
                    if (parent.name === subfield) {
                        const result = parent.service.getInstance(this.connectionName).translateParams(compl, parent.alias);
                        return result ? alias + result : undefined;
                    }
                }
                for (const child of this.childEntities) {
                    if (child.name === subfield) {
                        const result = child.service.getInstance(this.connectionName).translateParams(compl, child.alias);
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
    getRepository() {
        const connection = typeOrmManager_1.default.getConnection(this.connectionName);
        const repository = connection && connection.isConnected
            ? connection.getRepository(this.repositoryType)
            : undefined;
        if (!connection || !connection.isConnected || !repository) {
            throw new Error('Connection or repository not found.');
        }
        else {
            return repository;
        }
    }
    queryToString(refAlias, alias, qb, andWhereParamValue) {
        let where = qb.getQuery();
        if (where.indexOf('WHERE') === -1) {
            return undefined;
        }
        else {
            let end = where.indexOf('ORDER BY');
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
            where = where.replace(new RegExp(`${refAlias}${node_strings_module_1.default.firstCharToUpper(alias)}`, 'g'), alias);
            return {
                where,
                params: Object.assign(Object.assign({}, qb.getParameters()), andWhereParamValue)
            };
        }
    }
}
exports.default = Service;
