function makeAdapter() {

  return {
    query: function (query, parameters) {
      return new Promise((resolve, reject) => {
        resolve({query: query, parameters: parameters})
      })
    },
    escape: function (parameter) {
      return parameter
    },
    escapeIdentifier: function (identifier) {
      return identifier
    }
  }

}

module.exports = makeAdapter
