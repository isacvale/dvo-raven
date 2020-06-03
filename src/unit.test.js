import raven from './raven.js'

describe('Unit testing functions.', () => {

  test('Can detect arrays', () => {
    expect(raven.funcs.isArray([])).toBe(true)
    expect(raven.funcs.isArray({})).toBe(false)
    expect(raven.funcs.isArray(undefined)).toBe(false)
    expect(raven.funcs.isArray(null)).toBe(false)
  })

  test('Can detect objects', () => {
    expect(raven.funcs.isObject([])).toBe(false)
    expect(raven.funcs.isObject({})).toBe(true)
    expect(raven.funcs.isObject(undefined)).toBe(false)
    expect(raven.funcs.isObject(null)).toBe(false)
  })

  test('Can split path string into an array.', () => {
    expect(raven.funcs.fromStringToArray('a.b.c')).toEqual(['a', 'b', 'c'])
    expect(raven.funcs.fromStringToArray('a')).toEqual(['a'])
    expect(raven.funcs.fromStringToArray('')).toEqual([''])
  })

  test('Can join path array into string.', () => {
    expect(raven.funcs.fromArrayToString(['a', 'b', 'c'])).toEqual('a.b.c')
    expect(raven.funcs.fromArrayToString(['a'])).toEqual('a')
    expect(raven.funcs.fromArrayToString([''])).toEqual('')
  })

  test('Can reach inside object with a pathArray.', () => {
    const store = {
      a: 1,
      b: [1, 2],
      c: {
        d: 2
      }
    }
    raven.load(store)

    expect(raven.funcs.reach(store)(['a']))
      .toEqual({ 
        parentObject: store,
        propertyName: 'a',
        propertyValue: 1
      })
    expect(raven.funcs.reach(store)(['b']))
      .toEqual({ 
        parentObject: store,
        propertyName: 'b',
        propertyValue: [1, 2]
      })
    expect(raven.funcs.reach(store)(['c']))
      .toEqual({ 
        parentObject: store,
        propertyName: 'c',
        propertyValue: { d: 2 }
      })
    expect(raven.funcs.reach(store)(['c', 'd']))
      .toEqual({ 
        parentObject: store.c,
        propertyName: 'd',
        propertyValue: 2
      })
  })

  test('Can convert pathString into objects.', () => {
    expect(raven.funcs.fromStringToObject('a.b.c', 1))
      .toEqual({ a: { b: { c: 1 } } })

    expect(raven.funcs.fromStringToObject('a', [1, 2]))
    .toEqual({ a: [1, 2] })

    expect(raven.funcs.fromStringToObject('b', 10))
    .toEqual({ b: 10 })

    expect(raven.funcs.fromStringToObject('a.b.c.d', undefined))
    .toEqual({ a: { b: { c: {} } } })
  })

  test('Can merge two simple objects.', () => {
    const objA = { a: 1, b: 2 }
    const objB = { a: 10, c: 20 }
    expect(raven.funcs.mergeObjects(objA, objB))
      .toEqual({ a: 10, b: 2, c: 20 })
  })

  test('Can merge two simple objects.', () => {
    const objA = { a: 1, b: 2 }
    const objB = { a: 10, c: 20 }
    expect(raven.funcs.mergeObjects(objA, objB))
      .toEqual({ a: 10, b: 2, c: 20 })
  })

  test('Can merge two complex objects.', () => {
    const objA = { a: { b: { c: 1, d: 2 }, e: { f: 3 } } }
    const objB = { a: { b: { d: 20, g: 30 }, e: undefined } }

    expect(raven.funcs.mergeObjects(objA, objB))
      .not.toEqual({...objA, ...objB})
    expect(raven.funcs.mergeObjects(objA, objB))
      .toEqual({ a: { b: { c: 1, d: 20, g: 30 } } })
  })

  test('Can convert simple objects to array path.', () => {
    expect(raven.funcs.fromObjectToArrayList({ a: 2 }))
      .toEqual([['a']])
    expect(raven.funcs.fromObjectToArrayList({ a: { b: 1 } }))
      .toEqual([['a', 'b']])
  })

  test('Can convert simple objects to string path.', () => {
    expect(raven.funcs.fromObjectToStringList({ a: 2 }))
      .toEqual(['a'])
    expect(raven.funcs.fromObjectToStringList({ a: { b: 1 } }))
      .toEqual(['a.b'])
  })

  test('Can convert complex objects to array path.', () => {
    const complexObject = {
      a: {
        b: 1,
        c: {
          d: 2,
          e: 3
        },
        f: 4,
        g: undefined
      },
      h: 5
    }
    expect(raven.funcs.fromObjectToArrayList(complexObject))
      .toEqual([
        ['a', 'b'],
        ['a', 'c', 'd'],
        ['a', 'c', 'e'],
        ['a', 'f'],
        ['a', 'g'],
        ['h']
      ])
  })

  test('Can convert complex objects to string path.', () => {
    const complexObject = {
      a: {
        b: 1,
        c: {
          d: 2,
          e: 3
        },
        f: 4,
        g: undefined
      },
      h: 5
    }
    expect(raven.funcs.fromObjectToStringList(complexObject))
      .toEqual([
        'a.b',
        'a.c.d',
        'a.c.e',
        'a.f',
        'a.g',
        'h'
      ])
  })

  test('Can execute callbacks from a request.', () => {
    let count = 0
    const subList = {
      'a.b': [() => count += 1],
      'a.c': [() => count += 10],
      'a.c.d': [() => count += 100],
      'a.e': [() => count += 1000]
    }
    raven.funcs.executeCallbacks(
      {
        a: {
          b: 1,
          c: {
            d: 2
          }
        }
      },
      subList,
      {
        a: {
          b: 1,
          c: {
            d: 2
          }
        }
      }
    )
    expect(count).toBe(111)
  })

  test('Adds partial paths to an array path.', () => {
    const originalPathArray = [
      ['a', 'b'],
      ['c', 'd', 'e']
    ]
    expect(raven.funcs.addPartialPaths(originalPathArray))
      .toEqual([
        ['a', 'b'],
        ['a'],
        ['c', 'd', 'e'],
        ['c', 'd'],
        ['c']
      ])
  })

  test('Set function redirects objects correctly.', () => {
    let result;
    const dud = () => {}
    const callback = (...args) => {
      result = [...args]
    }
    raven.funcs.push({}, {}, dud, dud, callback)
    expect(result).toEqual([{}, {}, dud])
  })

  test('Set function redirects DOM elements correctly.', () => {
    let result;
    document.body.innerHTML = `<div id="dom-element"></div>`
    const obj = document.querySelector('#dom-element')
    const dud = () => {}
    const callback = (...args) => {
      result = [...args]
    }
    raven.funcs.push(obj, {}, dud, dud, callback)
    expect(result).toEqual([obj, {}, dud])
  })

  test('Data push from an object correctly updates on a target.', () => {
    raven.clear()
    raven.load({ target: {} })
    const fromObject = { a: 1 }
    expect(fromObject.a).toBe(1)
    raven.funcs.pushFromObject({
      target: fromObject,
      prop: 'a'
    }, { target: 1 })
    expect(fromObject.a).toBe(undefined)
    fromObject.a = 10
    expect(fromObject.a).toBe(10)
    expect(raven.store.target).toEqual(10)
  })


  // test('Can read property pushed from an object.', () => {
  //   raven.clear()
  //   raven.load({ target: {} })
  //   const fromObject = { a: 1 }
  //   raven.funcs.pushFromObject({
  //     target: fromObject,
  //     prop: 'a'
  //   }, { target: 1 })
  //   fromObject.a = 10
  //   expect(raven.store.target).toEqual(10)
  // })

  test('Data push from a DOM element correctly updates on a target.', () => {
    document.body.innerHTML =
      `<input type="text" id="dom-input">`
    const input = document.querySelector('#dom-input')

    raven.clear()
    raven.load({ target: {} })
    raven.funcs.pushFromElement({
      target: input
    }, { target: 1 })
  
    input.value = 'changedValue'
    const event = new Event('change')
    input.dispatchEvent(event)

    expect(raven.store.target).toBe('changedValue')
  })

  test('Can set a value to a single branch of an object.', () => {
    const originalObject = { a: { b: { c: false } } }
    const changedObject = raven.funcs.setValueToObject(originalObject)(true)
    expect(originalObject).toEqual({ a: { b: { c: false } } })
    expect(changedObject).toEqual({ a: { b: { c: true } } })
  })

  test('Can set a value to multiple branches of an object.', () => {
    const originalObject = { a: { b: { c: false }, d: false }, e: false }
    const changedObject = raven.funcs.setValueToObject(originalObject)(true)
    expect(originalObject).toEqual({ a: { b: { c: false }, d: false }, e: false })
    expect(changedObject).toEqual({ a: { b: { c: true }, d: true }, e: true })
  })

  test('Can create an object from an array of array properties.', () => {
    const paths = [['a', 'b', 'c', 1], ['a', 'b', 'd', 2], ['e', 3]]
    const createdObject = raven.funcs.fromArrayListToObject(paths)
    expect(createdObject).toEqual({
      a: {
        b: {
          c: 1,
          d: 2
        }
      },
      e: 3
    })
  })

})
