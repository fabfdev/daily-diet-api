import setupKnex, { type Knex } from 'knex'
import { env } from './env/index.js'

export const config: Knex.Config = {
  client: env.DATABASE_CLIENT,
  connection: {
    filename: './db/app.bd',
  },
  useNullAsDefault: true,
  migrations: {
    extension: 'ts',
    directory: './db/migrations',
  },
}

export const knex = setupKnex(config)
