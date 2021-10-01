import { gql } from '@cuillere/server-postgres'

export const typeDefs = gql`
  scalar Date
  scalar DateTime 

  type Query {
    hello(name: String): String!
    now: DateTime!
    wait(time: Int): String
  }
`
