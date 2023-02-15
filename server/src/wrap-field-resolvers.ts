import { isGeneratorFunction } from '@cuillere/core'
import type { IEnumResolver, IResolverObject, IResolverOptions, IResolvers } from 'graphql-tools'
import { isScalarType, GraphQLFieldResolver } from 'graphql'
import { defaultContextKey } from './context'
import { CUILLERE_CONTEXT_KEY, CUILLERE_INSTANCE, isCuillereSchema } from './schema'

type OneOrMany<T> = T | T[]

export function wrapFieldResolvers(resolvers: IResolvers): IResolvers
export function wrapFieldResolvers(resolvers: IResolvers[]): IResolvers[]
export function wrapFieldResolvers(resolvers: OneOrMany<IResolvers>): OneOrMany<IResolvers>
export function wrapFieldResolvers(resolvers: OneOrMany<IResolvers>) {
  if (isResolverArray(resolvers)) return resolvers.map(resolver => wrapFieldResolvers(resolver))

  const wrappedResolvers: IResolvers = {}

  for (const [key, value] of Object.entries(resolvers)) {
    if (value == null || isScalarType(value) || isEnumResolver(value)) wrappedResolvers[key] = value
    else if (typeof value === 'function') wrappedResolvers[key] = isGeneratorFunction(value) ? wrapFieldResolver(value) as () => any : value
    else if (isResolverOptions(value)) wrappedResolvers[key] = mapResolverOption(value)
    else wrappedResolvers[key] = applyToObject(value)
  }

  return wrappedResolvers
}

function applyToObject(resolverObject: IResolverObject): IResolverObject {
  const wrappedResolverObject: IResolverObject = {}

  for (const [key, value] of Object.entries(resolverObject)) {
    if (value == null) wrappedResolverObject[key] = value
    else if (typeof value === 'function') wrappedResolverObject[key] = isGeneratorFunction(value) ? wrapFieldResolver(value) as () => any : value
    else if (isResolverOptions(value)) wrappedResolverObject[key] = mapResolverOption(value)
    else wrappedResolverObject[key] = applyToObject(value)
  }

  return wrappedResolverObject
}

function wrapFieldResolver<TSource, TContext, TArgs = { [argName: string]: any }>(
  fn: GraphQLFieldResolver<TSource, TContext, TArgs>,
): GraphQLFieldResolver<TSource, TContext, TArgs> {
  return async (obj, args, ctx, info) => {
    if (!isCuillereSchema(info.schema)) throw TypeError('`info.schema` should be a `CuillereSchema`')
    return info.schema[CUILLERE_INSTANCE].ctx(ctx[info.schema[CUILLERE_CONTEXT_KEY] ?? defaultContextKey]).call(fn, obj, args, ctx, info)
  }
}

function isResolverArray(resolvers: OneOrMany<IResolvers>): resolvers is IResolvers[] {
  return Array.isArray(resolvers)
}

function isResolverOptions(value: any): value is IResolverOptions {
  return '__resolveType' in value
}

function mapResolverOption(value: IResolverOptions) {
  const result = {
    ...value,
  }
  if (result.resolve) {
    result.resolve = wrapFieldResolver(value.resolve)
  }
  if (result.subscribe) {
    result.subscribe = wrapFieldResolver(value.subscribe)
  }
  return result
}

function isEnumResolver(value: any): value is IEnumResolver {
  if (typeof value !== 'object') return false
  return Object.values(value).every(v => typeof v === 'string' || typeof v === 'number')
}
