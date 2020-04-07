function makeAdapter (connection, debugFn) {
  return {
    lastInsertId: null,
    query: function (query, parameters) {
      if (debugFn !== undefined) debugFn(query)

      return new Promise((resolve, reject) => {
        connection.query(query, parameters, (err, rows, fields) => {
          if (err) reject(err)
          else {
            if (rows && rows.insertId) this.lastInsertId = rows.insertId
            resolve(rows)
          }
        })
      })
    },
    escape: function (parameter) {
      return connection.escape(parameter)
    },
    escapeIdentifier: function (identifier) {
      return '`' + identifier + '`'
    }
  }
}

module.exports = makeAdapter
