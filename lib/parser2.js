


function parseQuery (sqlQuery, parameters) {
  return findAndReplaceParameterInQuery(sqlQuery, parameters)
}

function findAndReplaceParameterInQuery(sqlQuery, parameters) {
  const regexAnonymous = /:\?/g
  const regexNamed = /:(:{0,1}[~*]*)([a-zA-Z_][a-zA-Z0-9_]*)({.+})*/g
  const regexCast = /^::/
  const regexOptional = /:\*[^{]*\{[^}]*\}/g

  let matchesInQuery = [];
  let replacedSqlQuery = sqlQuery;

  // find and validate all named parameters
  let namedParameterMatch
  let undefinedParameter = []
  while ((namedParameterMatch = regexNamed.exec(sqlQuery)) !== null) {

    if (! regexCast.test(namedParameterMatch[0])) {
      const namedParameterName = namedParameterMatch[1] + namedParameterMatch[2]
      let replacement = '?'

      if (namedParameterMatch[0].match(regexOptional) && namedParameterMatch[3]) {
        if (parameters[namedParameterName] && parameters[namedParameterName] !== undefined) {
          replacement = namedParameterMatch[3].substring(1,namedParameterMatch[3].length - 1)
          replacement = replaceAtIndexWith(replacement, replacement.indexOf('*'),1, '?');
        } else {
          replacement = ''
        }
      } else if (!parameters[namedParameterName] || parameters[namedParameterName] === undefined) {
        undefinedParameter.push(namedParameterName)
        continue;
      }

      // extend array Parameter
      if (Array.isArray(parameters[namedParameterName])) {
        for (let i = 1; i < parameters[namedParameterName].length; i++) {
          replacement += ', ?'
        }

        replacement = `(${replacement})`
      }

      matchesInQuery.push({
        name: namedParameterName,
        index: namedParameterMatch.index,
        matchLength: namedParameterMatch[0].length,
        replacement: replacement
      })
    }
  }

  if (undefinedParameter.length > 0) {
    throw new Error('Undefined parameter(s) '+undefinedParameter.join(','))
  }

  matchesInQuery = sortMatchesByIndex(matchesInQuery);

  for(let i = matchesInQuery.length - 1; i >= 0; i--) {
    replacedSqlQuery = replaceAtIndexWith(
        replacedSqlQuery,
        matchesInQuery[i].index,
        matchesInQuery[i].matchLength,
        matchesInQuery[i].replacement
    );
  }

  return {
    parsedParameters: matchesInQuery,
    parsedQuery: replacedSqlQuery.trim()
  }
}

function sortMatchesByIndex(matches) {
  return matches.sort((matchA, matchB) =>  matchA.index - matchB.index);
}

function replaceAtIndexWith(string, replaceStart, replaceLength, replacement) {
  return string.substring(0, replaceStart) + replacement + string.substr(replaceStart + replaceLength);
}

// EXPORT
module.exports = {
  parseQuery: parseQuery
}

