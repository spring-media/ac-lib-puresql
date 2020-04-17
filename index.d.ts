import { Connection, RowDataPacket } from 'mysql2';
export { Connection, RowDataPacket }

export interface Parameters {[key: string]: any}

export interface DatabaseAdapter {
    connection: Connection
    query(query: string, parameters: Parameters): Promise<RowDataPacket>
    escapeIdentifier(identifier: string): string
}

export interface MysqlDatabaseAdapter extends DatabaseAdapter {
    connection: Connection
}

type MysqlAdapterFactory = (connection: Connection, debugFn?: () => {}) => MysqlDatabaseAdapter
type TestAdapterFactory = () => DatabaseAdapter

type Query  = (parameters: Parameters, adapter: DatabaseAdapter) => Promise<RowDataPacket>;

export interface QueryList {
    [key: string]: Query
}

export function defineQuery(sql: string): Query
export function loadQueries(filePath: string): QueryList

export const adapters: {
    mysql2: MysqlAdapterFactory,
    test: TestAdapterFactory
}
