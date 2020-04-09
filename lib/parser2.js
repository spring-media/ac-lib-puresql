function parseQuery(sqlQuery, parameters) {
  return findAndReplaceParameterInQuery(sqlQuery, parameters)
}

function findAndReplaceParameterInQuery(sqlQuery, parameters) {
  const regexAnonymous = /:\?/g
  const regexNamed = /:(:{0,1}[~*]*)([a-zA-Z_][a-zA-Z0-9_]*)({.+})*/g
  const regexPGCast = /^::/
  const regexOptional = /:\*[^{]*\{[^}]+\}/g
  const regexConditional = /:~.+/g

  let queryParameters = [];

  // find and validate all named parameters
  let namedParameterMatch
  let undefinedParameter = []
  while ((namedParameterMatch = regexNamed.exec(sqlQuery)) !== null) {

    if (regexPGCast.test(namedParameterMatch[0])) {
      // ignore postgres cast operator
      continue
    }

    const namedParameterName = namedParameterMatch[1] + namedParameterMatch[2]
    let replacement = '?'

    if (namedParameterMatch[0].match(regexOptional) && namedParameterMatch[3]) {
      // process optional parameter
      if (parameters[namedParameterName] && parameters[namedParameterName] !== undefined) {
        replacement = namedParameterMatch[3].substring(1, namedParameterMatch[3].length - 1)
        replacement = replaceAtIndexWith(replacement, replacement.indexOf('*'), 1, '?');
      } else {
        replacement = ''
      }
    } else if (!parameters[namedParameterName] || parameters[namedParameterName] === undefined) {
      undefinedParameter.push(namedParameterName)
      continue;
    }

    // extend array parameter
    if (Array.isArray(parameters[namedParameterName])) {
      for (let i = 1; i < parameters[namedParameterName].length; i++) {
        replacement += ', ?'
      }

      replacement = `(${replacement})`
    }

    // process dynamic parameter
    if (namedParameterMatch[0].match(regexConditional)) {
      const dynamicResult = buildDynamicQuery(parameters[namedParameterName])

      queryParameters.push({
        name: namedParameterName,
        userValue: dynamicResult.userValues,
        index: namedParameterMatch.index,
        matchLength: namedParameterMatch[0].length,
        replacement: dynamicResult.parsedQuery
      })
    } else {
      queryParameters.push({
        name: namedParameterName,
        userValue: parameters[namedParameterName],
        index: namedParameterMatch.index,
        matchLength: namedParameterMatch[0].length,
        replacement: replacement
      })
    }
  }

  if (undefinedParameter.length > 0) {
    throw new Error('Undefined parameter(s) ' + undefinedParameter.join(','))
  }

  queryParameters = sortMatchesByIndex(queryParameters);

  let userValues = []
  let replacedSqlQuery = sqlQuery;
  for (let i = queryParameters.length - 1; i >= 0; i--) {
    replacedSqlQuery = replaceAtIndexWith(
      replacedSqlQuery,
      queryParameters[i].index,
      queryParameters[i].matchLength,
      queryParameters[i].replacement
    );

    userValues.unshift(queryParameters[i].userValue)
  }

  const result = {
    userValues: userValues.flat(2),
    queryParameters: queryParameters,
    parsedQuery: replacedSqlQuery.trim()
  }

  return result
}

/**
 * constructs the replacement for dynamic parameters
 */
function buildDynamicQuery(dynamicDefinitions) {

  let userValues = []
  let queryParameters = []
  let parsedQueries = []

  for (let dynamicDefinition of dynamicDefinitions) {
    const operator = dynamicDefinition.operator.toUpperCase().trim()
    const terms = dynamicDefinition.terms.map(
      (term) => parseQuery(term.sql, term.parameters))

    switch (operator) {
      case 'OR':
      case 'AND':
        const termQuery = terms.map((term) => term.parsedQuery).join(` ${operator} `)
        parsedQueries.push(`(${termQuery})`)

        const termValues = terms.map((term) => term.userValues)
        userValues = userValues.concat(termValues.flat())

        const termParameters = terms.map((term) => term.queryParameters)
        queryParameters = queryParameters.concat(...termParameters)
        break;
    }
  }

  return {
    userValues: userValues.flat(),
    queryParameters: queryParameters,
    parsedQuery: parsedQueries.join(' ')
  }
}

function sortMatchesByIndex(matches) {
  return matches.sort((matchA, matchB) => matchA.index - matchB.index);
}

function replaceAtIndexWith(string, replaceStart, replaceLength, replacement) {
  return string.substring(0, replaceStart) + replacement + string.substr(replaceStart + replaceLength);
}

// EXPORT
module.exports = {
  parseQuery: parseQuery
}

