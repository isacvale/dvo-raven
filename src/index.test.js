import raven from './index.js'

describe('Testing setting data', () => {

  const dataSet = {
    country: 'Canada',
    province: 'Brittish Columbia',
    city: 'Vancouver'
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
    const inputElement = document.querySelector('.test-input')
    raven.push(
      {
        target: inputElement,
        prop: 'value'
      },
      'province'
    )
    inputElement.value = 'Nova Scotia'
    expect(dataSet.province).toBe('Nova Scotia')

    // const targetObject = { value: false }
    // raven.push(
    //   {
    //     target: targetObject,
    //     prop: 'value'
    //   },
    //   'province'
    // )
    // targetObject.value = 'Edward Island'
    // expect(dataSet.province).toBe('Edward Island')
  })

})