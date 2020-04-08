# puresql

This lib is based upon [puresql](https://github.com/neonerd/puresql).
This lib read sql files and map incomming parameters against the query-parameter to build prepared statements with [mysql2](https://www.npmjs.com/package/mysql2).

Until now: this lib can handle SELECT queries only.

## Intro

SQL is a great [DSL](https://en.wikipedia.org/wiki/Domain-specific_language) itself. Why abstract it and do this:

```js
const db = initDb(options)
const query = db.select('*').from('user').where('id', '=', 1)
```

When you can do this:

```sql
-- user.sql
-- name: get_user_by_id
SELECT *
FROM user
WHERE id = :id
```

```js
// something.js
const db = puresql.loadQueries('user.sql')

async function foo() {
const rows = await db.get_user_by_id({id:1}, adapter)
// do something with rows
}
```

## Installation

```
npm install ac-lib-puresql
```

## Usage

puresql takes a path to a .sql file containing query definitions and turns them into promisified functions. You can then call them and either pass one of the provided adapters (mySQL), or your own adapter (see one of the existing ones on the structure).

Alternatively, you can define individual queries manually via the exposed ```puresql.defineQuery(str)``` function.

## Quickstart

user.sql
```sql
-- name: get_by_id
SELECT *
FROM user
WHERE id = :id

-- name: get_all
SELECT *
FROM user

-- name: get_by_ids
SELECT *
FROM user
WHERE id IN :ids

-- name: get_or
SELECT *
FROM user
WHERE id = :? OR id = :?
```

basic.js
```js
const mysql = require("mysql")
const puresql = require("puresql")

// Create a connection the adapter will use
const connection = mysql.createConnection({
  host : '192.168.99.100',
  port : 3307,
  user : 'test',
  password : '',
  database : 'test'
})
// Create the adapter
const adapter = puresql.adapters.mysql(connection)

// Load our queries
const queries = puresql.loadQueries("user.sql")

// Do something
async function foo() {
  const rows = await queries.get_all({}, adapter)
  rows.map(row => {
    console.log('Name: ' + row.name)
  })
}
foo()
```

## Parameters

puresql query definitions can contain both named (:parameter) and anonymous (:?) parameters. These are later resolved by passing a parameters object into the query.

Arrays are automatically converted into their SQL representation.

If query function doesn't get all the parameters it needs, it throws an error.

Named parameters support modifiers. Cheatsheet:

|Implemented|Modifier|Name|Example|Parameter Input|Part in Query| 
|---|---|---|---|---|---|
|YES|(blank)|Anonymous parameter|:?|{'?':[1]}|?|
|YES|(blank)|Normal named parameter|:id|{id:1}|?|
|YES|(blank)|Array Parameters|:ids|{ids:[1,2]}|(?,?)|
|NO|$|Object parameter (insert)|:$user{name,rights}|{name:'foo', rights:'bar'}|('foo', 'bar')|
|NO|@|Object parameter (update)|:@user{name,rights}|{name:'foo', rights:'bar'}|name = 'foo', rights = 'bar'|
|NO|$ or @|Object parameter (schemaless)|:$user|{name:'foo', rights:'bar', somethingElse: 'test'}|('foo', 'bar', 'test')|
|YES|*|Optional parameter|:\*limit{LIMIT \*}|10|LIMIT 10 (if '\*limit' parameter is not undefined)|
|NO|~|Dynamic conditions|:~conditions|see bellow|see bellow|

Named parameter:
```js
// SELECT * FROM user WHERE id = :id
queries.get_by_id({id:42}, adapter)
// Query: SELECT * FROM user WHERE id = ?
// Parameters: [42]
```

Unnamed parameters (to be adopted):
```js
// SELECT * FROM user WHERE id = :? OR id = :?
queries.get_or({'?':[1, 2]}, adapter)
// Query: SELECT * FROM user WHERE id = ? OR id = ?
// Parameters: [1, 2]
```

Array:
```js
// SELECT * FROM user WHERE id IN :ids
queries.get_by_ids({ids:[1, 2, 3, 4]}, adapter)
// Query: SELECT * FROM user WHERE id IN (?, ?, ?, ?)
// Parameters: [1, 2, 3, 4]
```

Parameter existence validation:
```js
// SELECT * FROM user WHERE position = :position AND division = :division
queries.get_by_position_and_division({position:'manager'}, adapter)
// Throws an error
```

Ignore unnecessary parameter:
```js
// SELECT * FROM user WHERE position = :position
queries.get_by_position_and_division({position:'manager', division:'spring-media'}, adapter)
// Query: SELECT * FROM user WHERE position = ?
// Parameters: ['manager']
```

Optional parameters:
```js
// SELECT * FROM user ORDER BY name :*limit{LIMIT *!}
queries.get_users({'*limit': 10}, adapter)
// Query: SELECT * FROM user ORDER BY name LIMIT ?
// Parameters: [10]
queries.get_users({}, adapter)
// Query: SELECT * FROM user ORDER BY name
// Parameters: []
```

## Dynamic parameters (do be adopted)

When building parts of query dynamically (i.e. table filtering), you can use the dynamic (~) parameter type.

```js
// SELECT * FROM user WHERE :~conditions
queries.search_users({'~conditions':{
  operator: 'AND',
  parts: [
    ['position = :position', {position: 'manager'}],
    ['division = :division', {division: 'division'}]
  ]
}})
// SELECT * FROM user WHERE position = "manager" AND division = "division"
```

## Security

ac-lib-puresql didn't escapes any parameter at all, because mysqls prepared statements are there for it [reference](https://stackoverflow.com/questions/24988867/when-should-i-use-prepared-statements#answers).
Only identifier has to escaped properly.

## Database support

ac-lib-puresql provides its own default adapters for MySQL2 but is extensable by other adapters. They are accessible through puresql.adapter.X functions as described below.

### puresql.adapters.mysql(mysqlConnection, debugFn)

Returns a mySQL adapter. Takes connection object from 'mysql' module as parameter.

```js
// dependencies
const mysql = require('mysql')
const puresql = require('puresql')
// create a connection the adapter will use
const connection = mysql.createConnection({
  host : '192.168.99.100',
  port : 3307,
  user : 'test',
  password : '',
  database : 'test'
})
// create the adapter
const adapter = puresql.adapters.mysql(connection)
```

## API

puresql exposes these functions:

### puresql.loadQueries(filePath)

Parses provided file and returns an object literal in {queryName:fn} format.

```js
const queries = puresql.loadQueries('user.sql')
console.log(queries)

/*
{
  get_by_id : fn,
  get_all : fn,
  get_by_ids : fn,
  get_or : fn
}
*/
```

### puresql.defineQuery(str)

Returns a query function based on the provided string representation.

```js
const query = puresql.defineQuery("SELECT * FROM user WHERE id = :id")
```

### puresql.adapters.test()

Returns a testing adapter. This adapter always returns the parsed SQL query together with its sorted parameters as a result:

```json
{
  query: 'SELECT * FROM user',
  parameters: []
}
```

## License

MIT
