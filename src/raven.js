// When raven needs to use getter and setters on outside objects, it will make use of this prefix.
const prefix = '_'

/*
  Utilidades
*/

const pipe = (...operations) => data =>
  operations.reduce((acc, cur) => cur(acc), data)

const isArray = Array.isArray

const isObject = target =>
  typeof target === 'object'
  && !isArray(target)
  && target !== null

const isString = target => typeof target === 'string'

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
  const result = {...objA}
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

const pushFromElement = (from, to, callback = x => x) => {
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

const pushFromObject = (from, to, callback = x => x) => {  
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
      get: () => 'llalalala' //from.target[`${prefix}${from.prop}`]
    }
  )
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
  const callbackKeys = typeof target === 'string'
    ? [target]
    : fromObjectToStringList(target)
  callbackKeys.forEach(key =>
    raven.funcs.subscriptions[key] = [
      ...(raven.funcs.subscriptions[key] || []),
      callback
    ])
}

const clear = () => {
  raven.funcs.subscriptions = {}
}

const push = (from, to, callback = x => x, funcEl = pushFromElement, funcObj = pushFromObject) => {
  const func = from.target instanceof window.HTMLElement
    ? funcEl
    : funcObj
  func(from, to, callback)
}

const raven = {
  clear,
  load,
  set,
  store: {},
  subscribe,
  funcs: {
    addPartialPaths,
    addPartialArrayPaths,
    addPartialStringPaths,
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
    push,
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