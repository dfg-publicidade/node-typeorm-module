import { Connection } from 'typeorm';
declare class TypeOrmManager {
    static connect(config: any, name: string): Promise<Connection>;
    static close(name: string): Promise<void>;
    static getConnection(name: string): Connection;
    static wait(config: any): Promise<void>;
}
export default TypeOrmManager;
