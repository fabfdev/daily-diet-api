import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest'
import { app } from '../src/app'
import { execSync } from 'node:child_process'
import request from 'supertest'

describe('Meals routes', () => {
  const createMeal = async () => {
    return await request(app.server).post('/meals').send({
      name: 'Comida 1',
      description: 'Descrição da comida',
      in_diet: true,
      date: '2025-11-13',
      time: '06:00',
    })
  }

  const getMeal = async (cookie: string[]) => {
    return await request(app.server).get('/meals').set('Cookie', cookie)
  }

  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex -- migrate:rollback --all')
    execSync('npm run knex -- migrate:latest')
  })

  it('should be able to create a new meal', async () => {
    const createMealResponse = await createMeal()

    expect(createMealResponse.statusCode).toEqual(201)
  })

  it('should be able to update a meal', async () => {
    const createMealResponse = await createMeal()

    const cookies = createMealResponse.get('Set-Cookie')

    const mealsResponse = await getMeal(cookies!)

    const mealId = mealsResponse.body.meals[0].id

    await request(app.server)
      .put(`/meals/${mealId}`)
      .set('Cookie', cookies!)
      .send({
        name: 'Comida 2',
        description: 'Descrição da comida',
        in_diet: false,
        date: '2025-11-13',
        time: '06:00',
      })
      .expect(204)
  })

  it('should be able to delete a meal', async () => {
    const createMealResponse = await createMeal()

    const cookies = createMealResponse.get('Set-Cookie')

    const mealsResponse = await getMeal(cookies!)

    const mealId = mealsResponse.body.meals[0].id

    await request(app.server)
      .delete(`/meals/${mealId}`)
      .set('Cookie', cookies!)
      .expect(204)
  })

  it('should be able to list all meals', async () => {
    const createMealResponse = await createMeal()

    const cookies = createMealResponse.get('Set-Cookie')

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies!)
      .expect(200)

    expect(listMealsResponse.body.meals).toEqual([
      expect.objectContaining({
        name: 'Comida 1',
      }),
    ])
  })

  it('should be able to get summary', async () => {
    const createMealResponse = await createMeal()

    const cookies = createMealResponse.get('Set-Cookie')

    const summaryResponse = await request(app.server)
      .get('/meals/summary')
      .set('Cookie', cookies!)
      .expect(200)

    expect(summaryResponse.body).toEqual({
      totalMeals: 1,
      mealsInDiet: 1,
      mealsOutDiet: 0,
      bestSequence: 1,
    })
  })
})
