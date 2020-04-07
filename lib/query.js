const parser = require('./parser2')

function PureSQLException (message, sqlQuery, adapterError) {
  this.message = message
  this.query = sqlQuery
  this.adapterError = adapterError
  this.name = 'PureSQLException'
}

function validateParametersAgainstQueryParameters(parsedQueryParameters, parameters) {
  let undefinedParameters = parsedQueryParameters.filter((parsedQueryParameter) =>
    !parameters[parsedQueryParameter.name] || parameters[parsedQueryParameter.name] === undefined
  )

  if (undefinedParameters.length > 0) {
    undefinedParameters = undefinedParameters.map((undefinedQueryParameter) => undefinedQueryParameter.name);

    throw new Error('Undefined parameters '+undefinedParameters.join(','));
  }
}

/**
* Makes a function that parses passed SQL and returns a promisified function using the passed adapter.
*/
function makeQuery (sqlQuery) {
  return function (parameters, adapter) {
    // validate adapter
    if (adapter === undefined || adapter.query === undefined || adapter.escape === undefined) {
      throw new Error('Missing adapter!')
    }

    const parsedQueryAndParameters = parser.parseQuery(sqlQuery, parameters)
    validateParametersAgainstQueryParameters(parsedQueryAndParameters.parsedParameters, parameters)
    console.log('parsedQueryAndParameters', parsedQueryAndParameters);

    queryParameters = []
    parsedQueryAndParameters.parsedParameters.forEach((parsedQueryParameter) => {
      queryParameters.push(parameters[parsedQueryParameter.name])
    })

    // return promise
    return adapter.query(
        parsedQueryAndParameters.parsedQuery,
        queryParameters
    )
  }
}

// -- EXPORT
module.exports = {
  makeQuery: makeQuery
}
