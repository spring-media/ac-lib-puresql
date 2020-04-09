const parser = require('./parser2')

/**
 * Makes a function that parses passed SQL and returns a promisified function using the passed adapter.
 */
function makeQuery(sqlQuery) {
  return function (parameters, adapter) {
    // validate adapter
    if (adapter === undefined || adapter.query === undefined || adapter.escape === undefined) {
      throw new Error('Missing adapter!')
    }

    const parsedQueryAndParameters = parser.parseQuery(sqlQuery, parameters)

    // return promise
    return adapter.query(
      parsedQueryAndParameters.parsedQuery,
      parsedQueryAndParameters.userValues
    )
  }
}

// -- EXPORT
module.exports = {
  makeQuery: makeQuery
}
