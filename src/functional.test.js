import raven from './raven.js'

describe('Testing functionalities.', () => {
  test('Store can be loaded.', () => {
    const store = { a: 1 }
    raven.load(store)
    expect(raven.store).toEqual(store)
  })

  test('Store can be reloaded.', () => {
    const storeA = { a: 1 }
    raven.load(storeA)
    const storeB = { b: 1 }
    raven.load(storeB)
    expect(raven.store).toEqual(storeB)
  })

  test('Can use set to add simple data to the store with object request.', () => {
    const store = { a: 1 }
    raven.load(store)
    raven.set({ b: 2 })
    expect(raven.store).toEqual({ a: 1, b: 2 })
  })

  test('Can use set to add simple data to the store with string request.', () => {
    const store = { a: 1}
    raven.load(store)
    raven.set('b.c', 2)
    expect(raven.store).toEqual({ a: 1, b: { c: 2 } })
  })

  test('Can use set to add complex data to the store with object request.', () => {
    const store = { a: { b: 1, c: 2 } }
    raven.load(store)
    raven.set({ a: { c: 10, d: 20 } })
    expect(raven.store).toEqual({ a: { b: 1, c: 10, d: 20 } })
  })

  test('Can use set to add complex data to the store with string request.', () => {
    const store = { a: { b: 1, c: 2 } }
    raven.load(store)
    raven.set('a.c', 10)
    expect(raven.store).toEqual({ a: { b: 1, c: 10 } })
  })

  test('Can subscribe a callback.', () => {
    const fakeFunction = () => {}
    raven.clear()
    raven.subscribe({ a: { b: 1 } }, fakeFunction)
    expect(raven.funcs.subscriptions).toEqual({
      'a.b': [fakeFunction]
    })
  })

  test('Can subscribe a callback to multiple targets.', () => {
    const fakeFunction = () => {}
    raven.clear()
    raven.subscribe({ a: { b: 1, c: 2 }, d: 3 }, fakeFunction)
    expect(raven.funcs.subscriptions).toEqual({
      'a.b': [fakeFunction],
      'a.c': [fakeFunction],
      'd': [fakeFunction]
    })
  })

  test('Can subscribe a callback using a string path.', () => {
    const fakeFunction = () => {}
    raven.clear()
    raven.subscribe('a.b', fakeFunction)
    expect(raven.funcs.subscriptions).toEqual({
      'a.b': [fakeFunction]
    })
  })

  test('Can clear all subscribed callbacks.', () => {
    const fakeFunction = () => {}
    raven.subscribe({ a: 1 }, fakeFunction)
    raven.clear()
    expect(raven.funcs.subscriptions).toEqual({})
  })

  test('Can execute a simple callback.', () => {
    let flag = false
    raven.clear()
    raven.load({ a: 1 })
    raven.subscribe({ a: 1 }, () => flag = true)
    raven.set('a', 2)
    expect(flag).toBe(true)
  })

  test('Can execute a multiple callbacks.', () => {
    let count = 0
    raven.clear()
    raven.load({
      a: {
        b: {
          c: 1,
          d: 2,
          e: 3
        },
        f: {
          g: 4,
          h: 5
        }
      }
    })
    raven.subscribe({
      a: {
        b: {
          c: 1,
          e: 3
        },
        f: {
          g: 4
        }
      }
    }, () => count += 1)
    raven.set({
      a: {
        b: {
          c: 8
        },
        f: {
          g: 9,
        },
        i: 10
      },
      j: 11
    })
    expect(count).toBe(2)
  })

  test('Executes callbacks of partial paths.', () => {
    let count = 0
    raven.clear()
    raven.load({
      a: { b: { c: 1 } }
    })
    raven.subscribe('a', () => count += 1)
    raven.set('a.b.c', 2)
    expect(count).toBe(1)
  })

  test('Callbacks are executed with new simple state as parameter.', () => {
    raven.clear()
    raven.load({
      a: {
        b: 1
      }
    })
    let argument = false
    const callback = x => argument = x
    raven.subscribe('a.b', callback)
    raven.set('a.b', 'newValue')
    expect(argument).toBe('newValue')
  })

  test('Callbacks are executed with new complex state as parameter.', () => {
    raven.clear()
    raven.load({
      a: {
        b: 1
      }
    })
    let argument = false
    const callback = x => argument = x
    raven.subscribe('a', callback)
    raven.set('a.b', 'newValue')
    expect(argument).toEqual({ b: 'newValue' })
  })

  test('Callbacks are executed when array changes.', () => {
    const state = {
      a: {
        b: [1, 2]
      }
    }
    raven.clear()
    raven.load(state)
    let argument = false
    const callback = x => argument = x
    raven.subscribe('a', callback)
    raven.set('a.b', [...state.a.b, 3])
    expect(argument).toEqual({ b: [1, 2, 3] })
  })

  test('Callbacks are executed when object inside array changes.', () => {
    const state = {
      a: {
        b: [{ c: 3 }]
      }
    }
    raven.clear()
    raven.load(state)
    let argument = false
    const callback = x => argument = x
    raven.subscribe('a', callback)
    raven.set('a.b', [{...state.a.b[0], d: 4 } ])
    expect(argument).toEqual({ b: [{ c: 3, d: 4 }] })
  })

  test('Can push data change from object to store.', () => {
    const state = { a: { b: 'original' } }
    const externalObject = { prop: 'toBeOverWritten' }
    raven.clear()
    raven.load(state)
    raven.push({
      target: externalObject,
      prop: 'prop'
    }, { a : { b: 1 } })
    expect(raven.store.a.b).toBe('toBeOverWritten')
    externalObject.prop = 'overWrittenValue'
    expect(raven.store).toEqual({ a: { b: 'overWrittenValue' } })
  })

  test('Can push data change from object to store with a string path.', () => {
    const state = { a: { b: 'original' } }
    const externalObject = { prop: 'toBeOverWritten' }
    raven.clear()
    raven.load(state)
    raven.push({
      target: externalObject,
      prop: 'prop'
    }, 'a.b')
    expect(raven.store.a.b).toBe('toBeOverWritten')
    externalObject.prop = 'overWrittenValue'
    expect(raven.store).toEqual({ a: { b: 'overWrittenValue' } })
  })
})