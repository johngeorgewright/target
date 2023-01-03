import { Data, zod as z } from '@targetd/api'
import { StaticRecord } from '@targetd/api/dist/types'
import { Keys } from 'ts-toolbelt/out/Any/Keys'
import { ServedData } from './ServedData'
import { RuleWithPayload } from '@targetd/api/dist/validators/DataItemRule'

export class ClientData<
  DataValidators extends z.ZodRawShape,
  TargetingValidators extends z.ZodRawShape,
  QueryValidators extends z.ZodRawShape
> {
  readonly #data: Data<DataValidators, TargetingValidators, QueryValidators>
  readonly #query: Partial<StaticRecord<TargetingValidators>>

  constructor(
    data: Data<DataValidators, TargetingValidators, QueryValidators>,
    query: Partial<StaticRecord<TargetingValidators>> = {}
  ) {
    this.#data = data
    this.#query = query
  }

  add(data: ServedData<DataValidators, TargetingValidators>) {
    return new ClientData(
      Object.entries(data).reduce(
        (d, [key, value]) =>
          d.addRules(
            key as Keys<DataValidators>,
            isTargetable(value) ? value.__rules__ : [{ payload: value } as any]
          ),
        this.#data
      )
    )
  }

  setQuery(query: Partial<StaticRecord<TargetingValidators>>) {
    return new ClientData(this.#data, query)
  }

  getPayload<Name extends keyof DataValidators>(
    name: Name,
    rawQuery: Partial<StaticRecord<QueryValidators>> = {}
  ) {
    return this.#data.getPayload(name, { ...this.#query, ...rawQuery })
  }
}

function isTargetable(
  x: any
): x is { __rules__: z.infer<RuleWithPayload<any, any>>[] } {
  return typeof x === 'object' && x !== null && '__rules__' in x
}