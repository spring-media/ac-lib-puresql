import { Connection, RowDataPacket } from 'mysql2';

export interface Parameters {[key: string]: any}

export interface DatabaseAdapter {
    query(query: string, parameters: Parameters): Promise<RowDataPacket>
    escapeIdentifier(identifier: string): string
}

type MysqlAdapterFactory = (connection: Connection, debugFn?: () => {}) => DatabaseAdapter
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
