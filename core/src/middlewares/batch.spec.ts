import cuillere, { Cuillere, GeneratorFunction, batched, batchMiddelware, call } from '..'

const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

const afterDelay = async (fn: () => void, d: number) => {
  await delay(d)
  return fn()
}

describe('middlewares', () => {
  describe('batch', () => {
    let cllr: Cuillere
    const mock = jest.fn()
    let fn: GeneratorFunction

    beforeEach(() => {
      cllr = cuillere(batchMiddelware({ timeout: 0 }))
      mock.mockClear()
      fn = batched(function* fn(...args: any[]) {
        mock(...args)
        return [].concat(...args)
      })
    })

    it('should call a given operation', async () => {
      await cllr.call(fn)

      expect(mock).toBeCalled()
    })

    it('should call only once for multiple batched calls', async () => {
      await Promise.all([
        cllr.call(fn),
        cllr.call(fn),
        cllr.call(fn),
      ])

      expect(mock).toBeCalledTimes(1)
    })

    it('should call with an array of calls with the right length', async () => {
      await Promise.all([
        cllr.call(fn, 1),
        cllr.call(fn, 2),
        cllr.call(fn, 3),
      ])

      expect(mock.mock.calls[0].length).toBe(3)
    })

    it('should call with all given arguments', async () => {
      await Promise.all([
        cllr.call(fn, 1),
        cllr.call(fn, 2),
      ])

      expect(mock.mock.calls[0]).toContainEqual([1])
      expect(mock.mock.calls[0]).toContainEqual([2])
    })

    it('should return the right result for each btached call', async () => {
      const result = await Promise.all([
        cllr.call(fn, 1),
        cllr.call(fn, 2),
        cllr.call(fn, 3),
      ])

      expect(result).toEqual([1, 2, 3])
    })

    it("shouldn't batch calls after timeout", async () => {
      await cllr.call(fn)
      await delay(1)
      await cllr.call(fn)
      expect(mock).toBeCalledTimes(2)
    })

    it('should not debounce batch calls', async () => {
      cllr = cuillere(batchMiddelware({ timeout: 30 }))

      await Promise.all([
        cllr.call(fn, 1),
        afterDelay(() => cllr.call(fn, 2), 30),
        afterDelay(() => cllr.call(fn, 3), 45),
      ])

      expect(mock).toBeCalledTimes(2)
      expect(mock.mock.calls).toEqual([
        [[1], [2]],
        [[3]],
      ])
    })

    it('should not batch if batch key is falsy', async () => {
      const notBatched = batched(function* notBatched(...args: any[]) {
        mock(...args)
        return [].concat(...args)
      }, () => false)

      await Promise.all([
        cllr.call(notBatched),
        cllr.call(notBatched),
        cllr.call(notBatched),
      ])

      expect(mock).toBeCalledTimes(3)
    })

    it('should batch together calls with the same batch key', async () => {
      const fn = batched(function* fn(...args: [number][]) {
        mock(...args)
        return [].concat(...args)
      }, arg => arg)

      await Promise.all([
        cllr.call(fn, 1),
        cllr.call(fn, 1),
        cllr.call(fn, 2),
        cllr.call(fn, 2),
      ])

      expect(mock).toBeCalledTimes(2)
      expect(mock.mock.calls).toEqual([
        [[1], [1]],
        [[2], [2]],
      ])
    })

    it('should return the right result for not batched calls', async () => {
      const notBatched = batched<[number]>(function* notBatched(...calls: [number][]) {
        mock(...calls)
        return [].concat(...calls)
      }, () => false)

      const result = await cllr.call(notBatched, 1)

      expect(mock).toBeCalledWith([1])
      expect(result).toEqual(1)
    })

    it('should propagate promise rejection to all batched calls', async () => {
      const testError = 'testError'
      const throwing = batched(function* throwing() {
        throw testError
      })

      const result = Promise.all([
        cllr.call(throwing),
        cllr.call(throwing),
        cllr.call(throwing),
      ])

      await expect(result).rejects.toBe(testError)
    })

    it('should work in nested call', async () => {
      let nestedResult: any
      const batchedFn = batched(function* batchedFn(...calls) {
        mock.call(calls)
        return [].concat(calls)
      })

      function* handler() {
        nestedResult = yield call(batchedFn)
      }

      await cllr.call(handler)

      expect(nestedResult).toEqual([])
    })
  })
})
