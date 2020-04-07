


function parseQuery (sqlQuery, parameters) {
  return findAndReplaceParameterInQuery(sqlQuery, parameters)
}

function findAndReplaceParameterInQuery(sqlQuery, parameters) {
  const regexAnonymous = /:\?/g
  const regexNamed = /:(:{0,1}[~!@$*]*)([a-zA-Z0-9_]+)({.+})*/g
  const regexCast = /^::/

  let matchesInQuery = [];
  let replacedSqlQuery = sqlQuery;

  // let anonymousParameterMatch
  // while ((anonymousParameterMatch = regexAnonymous.exec(sqlQuery)) != null) {
  //   matchesInQuery.push({name: '?', index: anonymousParameterMatch.index})
  // }

  // find and validate all named parameters
  let namedParameterMatch
  while ((namedParameterMatch = regexNamed.exec(sqlQuery)) !== null) {

    if (! regexCast.test(namedParameterMatch[0])) {
      const namedParameterName = namedParameterMatch[1] + namedParameterMatch[2]
      let replacement = '?'

      if (Array.isArray(parameters[namedParameterName])) {
        for (let i = 1; i < parameters[namedParameterName].length; i++) {
          replacement += ', ?'
        }
      }

      matchesInQuery.push({
        name: namedParameterName,
        index: namedParameterMatch.index,
        matchLength: namedParameterMatch[0].length,
        replacement: replacement
      })

      /*      // if this modifier marks an object, validate the parameters for the presence of the object
            if (['$', '@'].indexOf(namedParameter[1]) > -1 && namedParameter[3] !== undefined) {
              parametersOptions[namedParameterName].objectKeys = validateObjectParameter(parameters[namedParameterName], namedParameter[3], missingParameters, namedParameterName)
            }*/
    }
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
    parsedQuery: replacedSqlQuery
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

