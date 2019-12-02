import cuillere from '@cuillere/core'
import { makeResolversTreeFactory } from '@cuillere/graphql'
import { queryMiddleware, query } from '@cuillere/postgres'

const cllr = cuillere(queryMiddleware())

const makeResolversTree = makeResolversTreeFactory(cllr)

export const resolvers = makeResolversTree({
  Query: {
    hello: function* (_, { name }) {
      let res = yield query({ text: 'SELECT NOW()', pool: 'foo' })
      res = yield query({ text: 'SELECT NOW()', pool: 'bar' })
      res = yield query({ text: 'SELECT NOW()', pool: 'bar' })
      const {
        rows: [{ now }],
      } = res
      return `Hello ${name} (${now})`
    },
  },

  Mutation: {
    setupDatabase: function* () {
      yield query({ pool: 'foo', text: 'CREATE TABLE names (name varchar(250))' })
    },
    addName: function* (_, { name }) {
      yield query({ pool: 'foo', text: 'INSERT INTO names VALUES ($1)', values: [name] })
      return name
    },
    setName: function* (_, { before, after }) {
      const { rows: [updated], } = yield query({
        pool: 'foo',
        text: 'UPDATE names SET name = $2 WHERE name = $1 RETURNING name',
        values: [before, after]
      })
      return updated && updated.name
    },
    wait: async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  },
})
