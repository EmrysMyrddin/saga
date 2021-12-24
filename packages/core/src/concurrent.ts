import { Effect } from './effect'
import { fork, Operation } from './operation'
import { Plugin } from './plugin'
import { type Task } from './task'

/**
 * @category for operations
 */
export interface ConcurrentOperation extends Operation {
  effects: Iterable<Effect>
}

const NAMESPACE = '@cuillere/concurrent'

export const concurrentPlugin = (): Plugin => ({
  namespace: NAMESPACE,

  handlers: {
    async* all({ effects }: ConcurrentOperation) {
      const tasks: Task[] = []
      for (const effect of effects) tasks.push(yield fork(effect))

      try {
        return await Promise.all(tasks.map(({ result }) => result))
      } catch (error) {
        const results = await Promise.allSettled(tasks.map(task => task.cancel()))
        error.errors = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(({ reason }) => reason)
          .filter(reason => reason !== error)
        throw error
      }
    },

    async* allSettled({ effects }: ConcurrentOperation) {
      const tasks = []
      for (const effect of effects) tasks.push(yield fork(effect))
      return Promise.allSettled(tasks.map(({ result }) => result))
    },
  },
})

function concurrent(kind: string) {
  const nsKind = `${NAMESPACE}/${kind}`

  const fn = {
    // Set the function name
    [kind](effects: Iterable<Effect>): ConcurrentOperation {
      return { kind: nsKind, effects }
    },
  }
  return fn[kind]
}

export const all = concurrent('all')
export const allSettled = concurrent('allSettled')
