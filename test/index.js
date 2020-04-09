/* global it, describe */
'use strict'

// test stuff
var chai = require('chai')
var expect = chai.expect
var chaiAsPromised = require("chai-as-promised");

// exported library
var puresql = require('../index')

// single components
var queryFactory = require('../lib/query')
var parser = require('../lib/parser2')
var file = require('../lib/file')

// -- TEST CONSTANTS
const FILE_SQL_MULTIPLE = __dirname + '/../fixtures/queries/user.sql'
const FILE_SQL_SINGLE = __dirname + '/../fixtures/queries/single.sql'
const FILE_SQL_WRONG = __dirname + '/../fixtures/queries/wrong.sql'

// -- TESTS

describe('puresql', () => {

    let adapter;

    before(() => {
        adapter = puresql.adapters.test()
    })

    it('should return a properly working function when defining a query manually', () => {
        let query = puresql.defineQuery('SELECT * FROM user')
        expect(query).to.be.a('function')
        return query({}, adapter)
            .then((result) => expect(result).to.be.eql({query: 'SELECT * FROM user', parameters: []}))
    })

    it('should return an object of properly working functions when loading queries from file', () => {
        let queries = puresql.loadQueries(FILE_SQL_MULTIPLE)

        expect(queries).to.be.an('object')
        expect(queries.get_with_comment).to.be.a('function')

        return queries.get_with_comment({ids: [4]}, adapter)
            .then((result) => {
                expect(result.query).to.equal('SELECT *\n-- here I do something\nFROM user\n-- another comment\n-- breaking comment with name: something\nWHERE id IN (?)')
            })
    })

    it('should give parameters to the adapter', () => {
        let queries = puresql.loadQueries(FILE_SQL_MULTIPLE)
        expect(queries).to.be.an('object')
        return queries.get_by_id({id: 42}, adapter)
            .then((result) => {
                expect(result.query).to.equal('SELECT *\nFROM user\nWHERE id = ?')
                expect(result.parameters[0]).to.equal(42);
            })
    })

    it('just ignore unnecessary parameters', () => {
        let queries = puresql.loadQueries(FILE_SQL_MULTIPLE)
        expect(queries).to.be.an('object')
        return queries.get_by_id({id: 42, foo: 'bar'}, adapter)
            .then((result) => {
                expect(result.query).to.equal('SELECT *\nFROM user\nWHERE id = ?')
                expect(result.parameters[0]).to.equal(42);
            })
    })

    it('should assign parameters in correct order to the adapter', () => {
        let queries = puresql.defineQuery('SELECT * FROM `Content` WHERE `Content` IN :contentIds AND id = :id')
        expect(queries).to.be.an('function')

        return queries({id: 42, contentIds: [1, 2, 3, 4]}, adapter)
            .then((result) => {
                expect(result.query).to.equal('SELECT * FROM `Content` WHERE `Content` IN (?, ?, ?, ?) AND id = ?')
                expect(result.parameters).to.eql([1, 2, 3, 4, 42])
            })
    })

    it('missing parameters have to trigger an error', function (done) {
        let queries = puresql.loadQueries(FILE_SQL_MULTIPLE)
        expect(queries).to.be.an('object')

        try {
            queries.get_by_id({}, adapter)
        } catch (e) {
            expect(e.message).to.equal('Undefined parameter(s) id')
            done()
        }
        throw new Error('undefined parameters need to trigger an error');
    })
})

describe('query parser', () => {
    it('should process unparametrized SQL correctly', () => {
        expect(
            parser.parseQuery('SELECT * FROM user', {}).parsedQuery
        ).to.equal('SELECT * FROM user')
    })

    it('should process named parameters correctly', () => {
        const result = parser.parseQuery('SELECT * FROM user WHERE id = :id', {id: 4});

        expect(result.parsedQuery).to.equal('SELECT * FROM user WHERE id = ?')
        expect(result.queryParameters[0].name).to.equal('id')
    })

    it('should replace multiple occurences of the same named parameter correctly', () => {

        const result = parser.parseQuery('SELECT * FROM user WHERE id = :id AND uid = :id', {id: 4});

        expect(result.parsedQuery).to.equal('SELECT * FROM user WHERE id = ? AND uid = ?')
        expect(result.queryParameters[0].name).to.equal('id')
        expect(result.queryParameters[1].name).to.equal('id')
    })

    it('should process array parameter correctly', () => {
        const result = parser.parseQuery('SELECT * FROM user WHERE id IN :ids', {ids: [1, 2, 3, 4]});

        expect(result.parsedQuery).to.equal('SELECT * FROM user WHERE id IN (?, ?, ?, ?)')
        expect(result.queryParameters[0].name).to.equal('ids')
        expect(result.queryParameters[0].replacement).to.equal('(?, ?, ?, ?)')
    })

    it('should throw an error when not passing all named parameters', () => {
        expect(() => {
            parser.parseQuery('SELECT * FROM user WHERE id = :id AND id = :id2 AND rights = :rights', {id: 1})
        }).to.throw('Undefined parameter(s) id2,rights')
    })

    it('should add optional part when parameter is present', () => {
        const result = parser.parseQuery('SELECT * FROM user ORDER BY id :*limit{LIMIT *}', {'*limit': 10});
        expect(result.parsedQuery).to.equal('SELECT * FROM user ORDER BY id LIMIT ?')
    })

    it('should remove optional part when parameter is not present', () => {
        const result = parser.parseQuery('SELECT * FROM user ORDER BY id :*limit{LIMIT *}', {});
        expect(result.parsedQuery).to.equal('SELECT * FROM user ORDER BY id')
    })

    it('should not match timestamp values', () => {
        const result = parser.parseQuery("SELECT * FROM user WHERE timestamp = '0000-00-00 00:00:00' OR id = :id", {'id': 42});
        expect(result.parsedQuery).to.equal("SELECT * FROM user WHERE timestamp = '0000-00-00 00:00:00' OR id = ?")
        expect(result.queryParameters[0].name).to.equal('id')
    })

})

// FILE PARSER
describe('file parser', () => {
    it('should process multiple command file correctly', () => {
        let queries = file.parseFile(FILE_SQL_MULTIPLE)

        expect(queries).to.be.an('object')
        expect(queries.get_by_id).to.equal('SELECT *\nFROM user\nWHERE id = :id')
        expect(queries.get_all).to.equal('SELECT *\nFROM user')
        expect(queries.get_with_comment).to.equal('SELECT *\n-- here I do something\nFROM user\n-- another comment\n-- breaking comment with name: something\nWHERE id IN :ids')
    })

    it('should process single command file correctly', () => {
        let queries = file.parseFile(FILE_SQL_SINGLE)
        expect(queries).to.be.an('object')
        expect(queries.single).to.equal('SELECT *\nFROM user')
    })

    it('should throw an error with improperly formatted file', () => {
        expect(() => file.parseFile(FILE_SQL_WRONG)).to.throw(Error)
    })
})

// QUERY FACTORY
describe('query factory', () => {
    it('should return a promisied function', () => {
        let query = queryFactory.makeQuery('SELECT * FROM user')
        expect(query).to.be.a('function')
    })

    it('should return a funtion that fail if adapter is not provided', () => {
        let query = queryFactory.makeQuery('SELECT * FROM user')
        expect(() => {
            query({})
        }).to.throw()
    })
})


// // QUERY PARSER
//
//   it('should process recursive array parameter correctly', () => {
//     expect(
//       parser.parseQuery({users: [['john', 'doe'], ['foo', 'bar']]}, 'INSERT INTO user (name, surname) VALUES :users', adapter)
//     ).to.equal('INSERT INTO user (name, surname) VALUES (john, doe), (foo, bar)')
//   })
//
//   it('should process object parameter correctly (insert modifier)', () => {
//     expect(
//       parser.parseQuery({'$user': {name: 'john', surname: 'doe'}}, 'INSERT INTO user (name, surname) VALUES :$user{name, surname}', adapter)
//     ).to.equal('INSERT INTO user (name, surname) VALUES (john, doe)')
//   })
//
//   it('should process object parameter correctly (update modifier)', () => {
//     expect(
//       parser.parseQuery({'@user': {name: 'john', surname: 'doe'}}, 'UPDATE user SET :@user{name, surname}', adapter)
//     ).to.equal('UPDATE user SET name = john, surname = doe')
//   })
//
//   it('should process an object parameter with array correctly', () => {
//     expect(
//       parser.parseQuery({'$user': [{name: 'john', surname: 'doe'}, {name: 'doe', surname: 'john'}]}, 'INSERT INTO user (name, surname) VALUES :$user{name, surname}', adapter)
//     ).to.equal('INSERT INTO user (name, surname) VALUES (john, doe), (doe, john)')
//   })
//
//   it('should process schemaless object parameter correctly (insert modifier)', () => {
//     expect(
//       parser.parseQuery({'$user': {name: 'john', surname: 'doe'}}, 'INSERT INTO user (name, surname) VALUES :$user', adapter)
//     ).to.equal('INSERT INTO user (name, surname) VALUES (john, doe)')
//   })
//
//   it('should process a dynamic parameter correctly', () => {
//     expect(
//       parser.parseQuery({
//         '~conditions': {
//           operator: 'AND',
//           parts: [
//             ['position = :position', {position: 'manager'}],
//             ['division = :division', {division: 'sales'}]
//           ]
//         }
//       }, 'SELECT * FROM user WHERE :~conditions', adapter)
//     ).to.equal('SELECT * FROM user WHERE position = manager AND division = sales')
//   })
//
//   it('should throw an error when passing wrong number of anonymous parameters', () => {
//     expect(() => {
//       parser.parseQuery({'?': [1]}, 'SELECT * FROM user WHERE id = :? AND rights = :?', adapter)
//     }).to.throw()
//   })
//
//   it('should execute conditioned part only when parameter is present', () => {
//     expect(
//       parser.parseQuery({'*limit': 10}, 'SELECT * FROM user ORDER BY id :*limit{LIMIT *}', adapter)
//     ).to.equal('SELECT * FROM user ORDER BY id LIMIT 10')
//   })
//
//   it('should properly execute conditioned part when using escaped parameter', () => {
//     expect(
//       parser.parseQuery({'*name': 'John Doe'}, 'SELECT * FROM user WHERE 1=1 :*name{AND name = *}', adapter)
//     ).to.equal('SELECT * FROM user WHERE 1=1 AND name = John Doe')
//   })
//
//   it('should not execute the conditioned part when parameter is not present, yet proceed with the quer', () => {
//     expect(
//       parser.parseQuery({}, 'SELECT * FROM user ORDER BY id :*limit{LIMIT *}', adapter)
//     ).to.equal('SELECT * FROM user ORDER BY id ')
//   })
//
// })
