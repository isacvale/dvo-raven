import raven from './index.js'

describe('Testing setting data', () => {

  const dataSet = {
    country: 'Canada',
    province: 'Brittish Columbia',
    city: 'Vancouver',
    nestedA: {
      nestedB: {
        nestedC: false
      }
    },
    dataTypes: {
      number: 1,
      falsyNumber: 0,
      string: 'a',
      falsyString: '',
      array: [],
      object: {},
      undefined: undefined,
      null: null,
      naN: NaN
    }
  }

  raven.load(dataSet)

  document.body.innerHTML = `
  <div>
    <input class="test-input" type="test">
  </div>
  `

  test('Can use set to overwrite store.', () => {
    raven.set({ city: 'Burnaby' })
    expect(dataSet.city).toBe('Burnaby')
  })

  test('Can subscribe a callback to change.', () => {
    let changed = false
    raven.subscribe('country', () => changed = true)
    raven.set({ country: 'Ireland' })
    expect(changed).toBe(true)
  })

  test("Direct changes won't cause a callback.", () => {
    let changed = false
    raven.subscribe('country', () => changed = true)
    dataSet.country = 'Scotland'
    expect(changed).toBe(false)
  })

  test("Can push data from an input to the store.", () => {
    const targetObject = { value: false }
    raven.push(
      {
        target: targetObject,
        prop: 'value'
      },
      'province'
    )
    targetObject.value = 'Edward Island'
    expect(dataSet.province).toBe('Edward Island')
  })

  test("Multiple callbacks are triggered in one change.", () => {
    let count = 0
    raven.subscribe('nestedA', () => count += 1)
    raven.subscribe({ nestedA: 'nestedB' }, () => count += 10)
    raven.subscribe({ nestedA: { nestedB: 'nestedC' } }, () => count += 100)
    // raven.subscribe({ nestedA: 'nestedB' }, () => count += 10)
    // raven.subscribe({ nestedA: { nestedB: 'nestedC' }}, () => count += 100)
    // raven.set({ nestedA: { nestedB: { nestedC: true } } })
    raven.set({ nestedA: { nestedB: { nestedC: true } } })
    expect(count).toBe(111)
  })

  test("Can set and retrieve numbers", () => {
    raven.set({ dataTypes: { number: 10 } })
    expect(dataSet.dataTypes.number).toBe(10)
  })

})