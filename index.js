/**
* puresql
* v 1.4.2
* Functional SQL abstraction for node.js (>6.0.0)
* Inspired by yesql (https://github.com/krisajenkins/yesql)
* Repository: https://github.com/neonerd/puresql
* Author: Andrej Sykora <as@andrejsykora.com>
* License: MIT License
*/

'use strict'

const file = require('./lib/file')
const query = require('./lib/query')

module.exports = {

  // define a single query based on the passed sql string
  defineQuery: function (sql) {
    return query.makeQuery(sql)
  },
  // define multiple queries based on a single file
  loadQueries: function (filePath) {
    const queries = file.parseFile(filePath)
    for (const key of Object.keys(queries)) {
      queries[key] = query.makeQuery(queries[key])
    }
    return queries
  },

  // readymade adapters
  // usage: require('puresql').adapters.mysql(mysqlConnection)
  adapters: {
    // mySQL using 'mysql' module
    mysql2: require('./lib/adapters/mysql2'),
    // dummy adapter for testing purposes
    test: require('./lib/adapters/test')
  }
}
