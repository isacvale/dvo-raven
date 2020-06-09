// When raven needs to use getter and setters on outside objects, it will make use of this prefix.
const prefix = '_'

/*
  Utilidades
*/

const pipe = (...operations) => data =>
  operations.reduce((acc, cur) => cur(acc), data)

const isArray = Array.isArray

const isObject = target =>
  typeof target === 'object' &&
  !isArray(target) &&
  target !== null

const isString = target => typeof target === 'string'

const identity = x => x

/*
  Data type transformation
*/

const fromStringToArray = path => path.split('.')
const fromStringListToArrayList = paths => paths.map(fromStringToArray)

const fromArrayToString = path => path.join('.')
const fromArrayListToStringList = paths => paths.map(fromArrayToString)

const fromArrayToObject = (path, value) =>
  path.reverse().reduce((acc, cur, idx) =>
    idx === 0
      ? { [cur]: value }
      : { [cur]: acc }
  , 0)
const fromArrayListToObject = arrayList =>
  arrayList
    .map(fullPath => {
      const shortPath = [...fullPath]
      const value = shortPath.pop()
      return fromArrayToObject(shortPath, value)
    })
    .reduce((acc, cur) => mergeObjects(acc, cur))

const fromStringToObject = (path, value) =>
  fromArrayToObject(fromStringToArray(path), value)

const fromObjectToArrayList = structure => {
  const paths = []
  const getPath = (object, path) => {
    Object.entries(object).forEach(entry => {
      const [key, value] = entry
      if (isObject(value)) {
        getPath(value, [...path, key])
      } else {
        paths.push([...path, key])
      }
    })
  }
  getPath(structure, [])
  return paths
}

const fromObjectToStringList = structure =>
  fromObjectToArrayList(structure).map(fromArrayToString)

const parseToObject = (dataStructure, value) =>
  typeof dataStructure === 'string'
    ? fromStringToObject(dataStructure, value)
    : dataStructure

/*
  Inner functions
*/

const reach = queryObject => path =>
  isArray(path)
    ? reachArray(queryObject, path)
    : reachString(queryObject, path)

const reachArray = (queryObject, path) => {
  if (path.length === 1) {
    return ({
      parentObject: queryObject,
      propertyName: path[0],
      propertyValue: queryObject[path[0]]
    })
  }
  const clonedArray = [...path]
  const nextProp = clonedArray.shift()
  const nextObject = queryObject[nextProp]
  return reach(nextObject)(clonedArray)
}

const reachString = (queryObject, path) =>
  reachArray(queryObject, fromStringToArray(path))

const addPartialPaths = paths =>
  isArray(paths[0])
    ? addPartialArrayPaths(paths)
    : addPartialStringPaths(paths)

const addPartialArrayPaths = paths => {
  const listOfPaths = []
  const addPath = path => {
    listOfPaths.push(path)
    if (path.length > 1) {
      const clonedPath = [...path]
      clonedPath.pop()
      addPath(clonedPath)
    }
  }
  paths.forEach(addPath)
  return listOfPaths
}

const addPartialStringPaths = paths =>
  pipe(
    fromStringListToArrayList,
    addPartialArrayPaths,
    fromArrayListToStringList
  )(paths)

const mergeObjects = (objA, objB) => {
  const result = { ...objA }
  Object.entries(objB).forEach(entry => {
    const [key, valueB] = entry
    const valueA = result[key]
    if (isObject(valueA) && isObject(valueB)) {
      result[key] = mergeObjects(valueA, valueB)
    } else {
      result[key] = valueB
    }
  })
  return result
}

const executeCallbacks = (request, sub = raven.funcs.subscriptions, store = raven.store) => {
  const paths = pipe(
    fromObjectToStringList,
    addPartialPaths)(request)
  const reachStore = reach(store)
  paths
    .filter(path => sub[path])
    .flatMap(path =>
      sub[path]
        .map(callback =>
          ({ path, callback })
        )
    )
    .forEach(item =>
      item.callback(reachStore(item.path).propertyValue)
    )
}

const setValueToObject = targetObject => value => {
  const pathList = fromObjectToArrayList(targetObject)
    .map(path => [...path, value])
  return fromArrayListToObject(pathList)
}

const copyValueToStore = (from, to, callback) => {
  const stateAdd = setValueToObject(to)(callback(from.target[from.prop]))
  set(stateAdd)
}

const pushFromElement = (from, to, callback = identity) => {
  const events = typeof from.event === 'string'
    ? [from.event]
    : from.event || ['change', 'input']
  events.forEach(event =>
    from.target.addEventListener(event, e => {
      const callbackArg = e.target.value || e.target.innerHTML
      const callbackResult = callback(callbackArg)
      set(setValueToObject(to)(callbackResult))
    })
  )
}

const pushFromObject = (from, to, callback = identity) => {
  from.target[`${prefix}${from.prop}`] = from.target[from.prop]
  copyValueToStore(from, to, callback)
  Object.defineProperty(
    from.target,
    from.prop,
    {
      set: value => {
        const result = callback(value)
        fromObjectToStringList(to)
          .forEach(path =>
            raven.set(path, result)
          )
        from.target[`${prefix}${from.prop}`] = value
      },
      get: () => from.target[`${prefix}${from.prop}`]
    }
  )
}

const pullToElement = (from, to, callback = identity) => {
  const currentValue = reach(raven.store)(from).propertyValue
  to.target[to.prop] = callback(currentValue)
  subscribe(from, value => { to.target[to.prop] = callback(value) })
}

/*
  API
*/

const load = userStore => {
  raven.store = userStore
}

const set = (request, value) => {
  const newValue = typeof request === 'string'
    ? fromStringToObject(request, value)
    : request
  load(mergeObjects(raven.store, newValue))
  executeCallbacks(newValue)
}

const subscribe = (target, callback) => {
  const callbackKeys = isObject(target)
    ? fromObjectToStringList(target)
    : isArray(target)
      ? [fromArrayToString(target)]
      : [target]
  callbackKeys.forEach(key => {
    raven.funcs.subscriptions[key] = [
      ...(raven.funcs.subscriptions[key] || []),
      callback
    ]
  })
}

const clear = condition => {
  if (!condition) {
    raven.funcs.subscriptions = {}
    return
  }

  const conditionArray = isArray(condition)
    ? condition
    : [condition]

  conditionArray.forEach(item => {
    if (isString(item)) {
      delete raven.funcs.subscriptions[item]
    } else {
      Object.keys(raven.store).forEach(key => {
        if (raven.funcs.subscriptions[key]) {
          raven.funcs.subscriptions[key] = raven.funcs.subscriptions[key]
            .filter(callback => callback !== item)
        }
      })
    }
  })
}

// Push changes from an object/DOM element to a target object
const push = (from, to, callback = identity, funcEl = pushFromElement, funcObj = pushFromObject) => {
  const parsedTo = parseToObject(to, true)
  const func = from.target instanceof window.HTMLElement
    ? funcEl
    : funcObj
  func(from, parsedTo, callback)
}

// Pull changes from an object to a target object/Dom element
const pull = (from, to, callback = identity, funcEl = pullToElement) => {
  let parsedFrom = from
  if (isObject(from)) {
    const allPaths = fromObjectToArrayList(from)
    if (allPaths.length > 1) {
      throw new Error('Raven.pull cannot be passed an object with multiple properties.')
    } else {
      parsedFrom = allPaths[0]
    }
  }
  funcEl(parsedFrom, to, callback)
}

// Push and pull shortcut that assumes a link between a DOM element and the store
const sync = (path, element, callbackToPath = identity, callbackToElement = identity) => {
  pull(path, element, callbackToElement)
  push(element, path, callbackToPath)
}

const raven = {
  clear,
  load,
  pull,
  push,
  set,
  store: {},
  subscribe,
  sync,
  funcs: {
    addPartialPaths,
    addPartialArrayPaths,
    addPartialStringPaths,
    copyValueToStore,
    fromArrayListToObject,
    fromArrayToString,
    fromStringToObject,
    fromObjectToStringList,
    fromObjectToArrayList,
    fromStringToArray,
    executeCallbacks,
    isArray,
    isObject,
    isString,
    mergeObjects,
    pullToElement,
    pushFromObject,
    pushFromElement,
    reach,
    reachArray,
    reachString,
    setValueToObject,
    subscriptions: {}
  }
}

export default raven
