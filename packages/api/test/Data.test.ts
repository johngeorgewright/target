import z from 'zod'
import Data from '../src/Data'

const timeout = <T>(ms: number, returnValue: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(returnValue), ms))

test('getPayload', async () => {
  const data = Data.create()
    .useDataValidator('foo', z.string())
    .useTargeting('weather', {
      predicate: (q) => (t) => typeof q === 'string' && t.includes(q),
      queryValidator: z.string(),
      targetingValidator: z.array(z.string()),
    })
    .useTargeting('highTide', {
      predicate: (q) => (t) => q === t,
      queryValidator: z.boolean(),
      targetingValidator: z.boolean(),
    })
    .useTargeting('asyncThing', {
      predicate: (q) => timeout(10, (t) => q === t && timeout(10, true)),
      queryValidator: z.boolean(),
      targetingValidator: z.boolean(),
    })
    .addRules('foo', [
      {
        targeting: {
          highTide: true,
          weather: ['sunny'],
        },
        payload: '🏄‍♂️',
      },
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😎',
      },
      {
        targeting: {
          weather: ['rainy'],
        },
        payload: '☂️',
      },
      {
        targeting: {
          highTide: true,
        },
        payload: '🌊',
      },
      {
        targeting: {
          asyncThing: true,
        },
        payload: 'Async payload',
      },
      {
        payload: 'bar',
      },
      {
        targeting: {
          // @ts-expect-error
          nonExistantKey: 'some value',
        },
        payload: 'error',
      },
    ])

  expect(await data.getPayload('foo', {})).toBe('bar')
  expect(await data.getPayload('foo', { weather: 'sunny' })).toBe('😎')
  expect(await data.getPayload('foo', { weather: 'rainy' })).toBe('☂️')
  expect(await data.getPayload('foo', { highTide: true })).toBe('🌊')
  expect(
    await data.getPayload('foo', { highTide: true, weather: 'sunny' })
  ).toBe('🏄‍♂️')
  expect(await data.getPayload('foo', { asyncThing: true })).toBe(
    'Async payload'
  )
  // @ts-expect-error
  await data.getPayload('mung', {})
  // @ts-expect-error
  await data.getPayload('foo', { nonExistantKey: 'some value' })
})

test('targeting without requiring a query', async () => {
  const data = Data.create()
    .useDataValidator('foo', z.string())
    .useTargeting('time', {
      predicate: () => (t) => t === 'now!',
      queryValidator: z.undefined(),
      requiresQuery: false,
      targetingValidator: z.literal('now!'),
    })
    .addRules('foo', [
      {
        targeting: {
          time: 'now!',
        },
        payload: 'The time is now',
      },
      {
        payload: 'bar',
      },
    ])

  expect(await data.getPayload('foo', {})).toBe('The time is now')
})

test('getPayloads', async () => {
  const data = Data.create()
    .useDataValidator('foo', z.string())
    .useTargeting('weather', {
      predicate: (q) => (t) => typeof q === 'string' && t.includes(q),
      queryValidator: z.string(),
      targetingValidator: z.array(z.string()),
    })
    .useTargeting('highTide', {
      predicate: (q) => (t) => q === t,
      queryValidator: z.boolean(),
      targetingValidator: z.boolean(),
    })
    .addRules('foo', [
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😎',
      },
      {
        targeting: {
          weather: ['rainy', 'sunny'],
        },
        payload: '☂️',
      },
      {
        targeting: {
          highTide: true,
        },
        payload: '🏄‍♂️',
      },
      {
        payload: 'bar',
      },
    ])

  expect(await data.getPayloads('foo', { weather: 'sunny' }))
    .toMatchInlineSnapshot(`
    [
      "😎",
      "☂️",
      "bar",
    ]
  `)
})

test('payload runtype validation', () => {
  try {
    Data.create()
      .useDataValidator(
        'foo',
        z.string().refine((x) => x === 'bar', 'Should be bar')
      )
      .addRules('foo', [
        {
          payload: 'rab',
        },
      ])
  } catch (error: any) {
    expect(error).toMatchInlineSnapshot(`
      [ZodError: [
        {
          "code": "custom",
          "message": "Should be bar",
          "path": [
            "foo",
            "rules",
            0,
            "payload"
          ]
        }
      ]]
    `)
    return
  }

  throw new Error('Didnt error correctly')
})

test('getPayloadForEachName', async () => {
  const data = Data.create()
    .useDataValidator('foo', z.string())
    .useDataValidator('bar', z.string())
    .useTargeting('weather', {
      predicate: (q) => (t) => typeof q === 'string' && t.includes(q),
      queryValidator: z.string(),
      targetingValidator: z.array(z.string()),
    })
    .useTargeting('highTide', {
      predicate: (q) => (t) => q === t,
      queryValidator: z.boolean(),
      targetingValidator: z.boolean(),
    })
    .useTargeting('asyncThing', {
      predicate: (q) => timeout(10, (t) => q === t && timeout(10, true)),
      queryValidator: z.boolean(),
      targetingValidator: z.boolean(),
    })
    .addRules('foo', [
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😎',
      },
      {
        targeting: {
          weather: ['rainy'],
        },
        payload: '☂️',
      },
    ])
    .addRules('bar', [
      {
        targeting: {
          weather: ['rainy'],
        },
        payload: '😟',
      },
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😁',
      },
      {
        targeting: {
          asyncThing: true,
        },
        payload: 'async payloads!',
      },
    ])

  expect(await data.getPayloadForEachName({ weather: 'sunny' }))
    .toMatchInlineSnapshot(`
    {
      "bar": "😁",
      "foo": "😎",
    }
  `)

  expect(await data.getPayloadForEachName({ asyncThing: true }))
    .toMatchInlineSnapshot(`
    {
      "bar": "async payloads!",
      "foo": undefined,
    }
  `)
})