import { CuillereServer } from '@cuillere/server-postgres'

import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { ensurePostgresSchema, poolConfig } from './postgres'

const server = new CuillereServer(
  {
    typeDefs,
    resolvers,
  },
  {
    poolConfig,
  },
)

async function start() {
  try {
    await ensurePostgresSchema()

    server.listen({ port: 4000 }, () => console.log(`🥄 Server ready at http://localhost:4000${server.graphqlPath}`))
  } catch (err) {
    console.error('💀 Starting server failed')
    console.error(err)
    process.exit(1)
  }
}

start()
