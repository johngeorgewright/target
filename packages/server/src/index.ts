import { type Data } from '@targetd/api'
import cors from 'cors'
import express from 'express'
import queryTypes from 'query-types'
import { errorHandler } from './middleware/error'
import { StatusError } from './StatusError'
import { castQueryArrayProps } from './middleware/castQueryArrayProps'
import { type ZodRawShape } from 'zod'

export function createServer<
  DataValidators extends ZodRawShape,
  TargetingValidators extends ZodRawShape,
  QueryValidators extends ZodRawShape,
  FallThroughTargetingValidators extends ZodRawShape,
>(
  data:
    | Data<
        DataValidators,
        TargetingValidators,
        QueryValidators,
        FallThroughTargetingValidators
      >
    | (() => Data<
        DataValidators,
        TargetingValidators,
        QueryValidators,
        FallThroughTargetingValidators
      >),
) {
  const getData = typeof data === 'function' ? data : () => data

  return express()
    .use(cors())

    .get(
      '/:name',
      queryTypes.middleware(),
      castQueryArrayProps(getData),
      async (req, res, next) => {
        const data = getData()

        if (!(req.params.name in data.dataValidators)) {
          return next(
            new StatusError(404, `Unknown data property ${req.params.name}`),
          )
        }

        let payload: any
        try {
          payload = await data.getPayload(req.params.name, req.query as any)
        } catch (err) {
          return next(err)
        }

        if (payload === undefined) res.sendStatus(204)
        else res.json(payload)
      },
    )

    .get(
      '/',
      queryTypes.middleware(),
      castQueryArrayProps(getData),
      async (req, res, next) => {
        let payloads: Record<string, any>
        try {
          payloads = await getData().getPayloadForEachName(req.query as any)
        } catch (err) {
          return next(err)
        }
        res.json(payloads)
      },
    )

    .use(errorHandler())
}
