import { ObjectType, Repository } from 'typeorm';
import JoinType from '../enums/joinType';
declare abstract class Service<T> {
    deletedAtField: string;
    protected defaultSorting: any;
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
    }[];
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
    }[];
    private repositoryType;
    private connectionName;
    protected constructor(repositoryType: ObjectType<T>, connectionName: string);
    setJoins(alias: string, qb: any, options?: {
        origin?: string;
        joinType?: JoinType;
        subitems?: string[];
        ignore?: string[];
        only?: string[];
    }, andWhere?: any): void;
    setDefaultQuery(alias: string, qb: any): void;
    getSorting(alias: string, options?: {
        origin?: string;
        sort?: any;
        subitems?: string[];
        ignore?: string[];
        only?: string[];
    }): any;
    translateParams(param: string, alias?: string): string;
    getRepository(): Repository<T>;
    private queryToString;
}
export default Service;
