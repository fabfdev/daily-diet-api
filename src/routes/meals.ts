import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      in_diet: z.boolean(),
      date: z.string(),
      time: z.string(),
    })

    const {
      name,
      description,
      in_diet: inDiet,
      date,
      time,
    } = createMealBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    const createdAt = new Date(`${date}T${time}:00`)

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,
      in_diet: inDiet,
      created_at: createdAt.toISOString(),
      session_id: sessionId,
    })

    return reply.status(201).send()
  })

  app.put(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const updateMealParamsSchema = z.object({
        id: z.uuid(),
      })

      const updateMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        in_diet: z.boolean(),
      })

      const { id } = updateMealParamsSchema.parse(request.params)
      const {
        name,
        description,
        in_diet: inDiet,
      } = updateMealBodySchema.parse(request.body)

      const sessionId = request.cookies.sessionId!

      const meal = await knex('meals')
        .where({ id, session_id: sessionId })
        .first()

      if (!meal) {
        return reply.status(404).send({ error: 'Meal not found' })
      }

      await knex('meals').where({ id }).update({
        name,
        description,
        in_diet: inDiet,
      })

      return reply.status(204).send()
    },
  )

  app.delete(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const deleteMealParamsSchema = z.object({
        id: z.uuid(),
      })

      const { id } = deleteMealParamsSchema.parse(request.params)

      const sessionId = request.cookies.sessionId!

      const meal = await knex('meals')
        .where({ id, session_id: sessionId })
        .first()

      if (!meal) {
        return reply.status(404).send({ error: 'Meal not found' })
      }

      await knex('meals').where({ id }).delete()

      return reply.status(204).send()
    },
  )

  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const sessionId = request.cookies.sessionId!
      const meals = await knex('meals')
        .where({ session_id: sessionId })
        .select('*')

      return { meals }
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const getMealParamsSchema = z.object({
        id: z.uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)
      const sessionId = request.cookies.sessionId!

      const meal = await knex('meals')
        .where({ id, session_id: sessionId })
        .first()

      return { meal }
    },
  )

  app.get(
    '/summary',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const sessionId = request.cookies.sessionId!
      const meals = await knex('meals')
        .where({ session_id: sessionId })
        .select('*')

      const totalMeals = meals.length
      const mealsInDiet = meals.filter((meal) => meal.in_diet).length
      const mealsOutDiet = meals.filter((meal) => !meal.in_diet).length

      let currentStreak = 0
      let bestStreak = 0

      const sortedMeals = meals.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )

      for (const meal of sortedMeals) {
        if (meal.in_diet) {
          currentStreak++
          if (currentStreak > bestStreak) {
            bestStreak = currentStreak
          }
        } else {
          currentStreak = 0
        }
      }

      return {
        totalMeals,
        mealsInDiet,
        mealsOutDiet,
        bestSequence: bestStreak,
      }
    },
  )
}
