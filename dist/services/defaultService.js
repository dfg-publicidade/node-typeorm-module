"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
        const joinType = options && options.joinType ? options.joinType : 'innerJoinAndSelect';
        for (const parent of this.parentEntities) {
            if (options && options.only && options.only.indexOf(parent.name) === -1) {
                break;
            }
            if (options && options.ignore && options.ignore.indexOf(`${alias}${parent.alias}`) !== -1) {
                continue;
            }
            if (!options || !options.origin || parent.name !== options.origin && !parent.alias.endsWith(options.origin)) {
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
                let parentJoinType = joinType;
                if (parentJoinType === 'innerJoinAndSelect' && parent.joinType) {
                    parentJoinType = parent.joinType;
                }
                qb[parentJoinType](`${alias}.${parent.name}`, `${alias}${parent.alias}`, andWhereParam, andWhereParamValue, {
                    joinType: parentJoinType
                });
                parent.service.getInstance(this.connectionName).setJoins(`${alias}${parent.alias}`, qb, {
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
                    if (options && options.ignore && options.ignore.indexOf(`${alias}${child.alias}`) !== -1) {
                        continue;
                    }
                    if (child.name === subitem) {
                        const childJoinType = joinType && (joinType === 'leftJoin' || joinType === 'leftJoinAndSelect') ? joinType :
                            child.joinType ? child.joinType : 'leftJoinAndSelect';
                        const childService = child.service.getInstance(this.connectionName);
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
                        let where = '';
                        if (childService.deletedAtField) {
                            where = `${alias}${child.alias}.${childService.deletedAtField} IS NULL `;
                        }
                        if (child.andWhere) {
                            where += where ? `AND ${child.andWhere} ` : ` ${child.andWhere} `;
                        }
                        if (andWhereParam) {
                            where += where ? `AND ${andWhereParam}` : ` ${andWhereParam} `;
                        }
                        qb[childJoinType](`${alias}.${child.name}`, `${alias}${child.alias}`, where, andWhereParamValue);
                        childService.setJoins(`${alias}${child.alias}`, qb, {
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
    setDefaultQuery(alias, qb) {
        if (this.deletedAtField) {
            qb.andWhere(`${alias}.${this.deletedAtField} IS NULL`);
        }
        for (const parent of this.parentEntities) {
            if (parent.dependent) {
                parent.service.getInstance(this.connectionName).setDefaultQuery(`${alias}${parent.alias}`, qb);
            }
        }
    }
    getSorting(alias, options) {
        let sort = {};
        if (!options || !options.sort || Object.keys(options.sort).length === 0) {
            for (const key of Object.keys(this.defaultSorting)) {
                sort[key.replace('$alias', alias)] = this.defaultSorting[key];
            }
            for (const parent of this.parentEntities) {
                if (!options || !options.origin || parent.name !== options.origin && !parent.alias.endsWith(options.origin)) {
                    if (options && options.only && options.only.indexOf(parent.name) === -1) {
                        break;
                    }
                    if (options && options.ignore && options.ignore.indexOf(`${alias}${parent.alias}`) !== -1) {
                        continue;
                    }
                    if (!options || !options.origin || parent.name !== options.origin && !parent.alias.endsWith(options.origin)) {
                        sort = Object.assign(Object.assign({}, sort), parent.service.getInstance(this.connectionName).getSorting(`${alias}${parent.alias}`, {
                            ignore: options ? options.ignore : undefined,
                            only: parent.only
                        }));
                    }
                }
            }
            if (options && options.subitems) {
                for (const subitem of options.subitems) {
                    for (const child of this.childEntities) {
                        if (options && options.only && options.only.indexOf(child.name) === -1) {
                            break;
                        }
                        if (options && options.ignore && options.ignore.indexOf(`${alias}${child.alias}`) !== -1) {
                            continue;
                        }
                        if (child.name === subitem) {
                            sort = Object.assign(Object.assign({}, sort), child.service.getInstance(this.connectionName).getSorting(`${alias}${child.alias}`, {
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
                return alias + '.' + compl;
            }
        }
    }
    getRepository() {
        const connection = typeOrmManager_1.default.getConnection(this.connectionName);
        const repository = connection && connection.isConnected
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
exports.default = Service;
