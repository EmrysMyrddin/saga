import { CORE_NAMESPACE } from '../core-namespace'
import { Effect } from '../effect'
import { Operation } from './operation'
import { Generator } from '../generator'

/**
 * @category for operations
 */
export interface ExecuteOperation<R = any> extends Operation {
  gen: Generator<R, Effect>
}

/**
 * @internal
 */
export function execute<R = any>(gen: Generator<R, Effect>): ExecuteOperation {
  return { kind: `${CORE_NAMESPACE}/execute`, gen }
}
