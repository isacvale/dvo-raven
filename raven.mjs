const raven = {

  /*
  Allows the registration of the store, so it doesn't have to be resupplied constantly.
  */
  store: {},
  load( userStore ){
  this.store = userStore
  },

  /*
  An object will hold as keys a reference to objects, arrays or scalars. They keys are a stringified version of the object.
  As values to those keys it holds a list of callback functions to call when it detects changes.
  */
  sub: {},

  /*
  A prefix for getter/setters.
  */
  prefix: "_",

  /*
  These functions will detect the type of a prop so it can be dealt with properly.
  */
  isArray (prop){
    return Array.isArray( prop )
  },
  isObject (prop){
    return typeof prop == "object" && !this.isArray( prop ) && prop != null
  },

  /*
  Gets an array of strings and uses them to reach inside an object to return a nested property.
    Example:
    Assume a state = {a: {b: 'c'}},
    passing an argument ['a','b'] would
    return the object { target: {b: 'c'}, prop: 'b' }.
  */
  reach (arr, obj=this.store) {
    if(arr.length == 1)
    return {target:obj, prop: arr[0]}
  
    const newArray = [...arr]
    const popped = newArray.shift()
    const nextObj = obj[popped]
    return this.reach(newArray, nextObj)
  },

  /*
  Takes an object and returns an array of arrays, each containing the strings to make up the branches of the object.
    Example:
    Passing an object {a: {b: 1, c: 2}}
    would return [[a,b], [a,c]]
  */
  treeToList ( obj ) {
    let i=0
    const original = []

    const treeToListLoop = (obj, acc=[]) => {
      if (this.isObject(obj))
        Object.keys(obj).forEach( child =>
          treeToListLoop( obj[child], [...acc, child]))
      else if (this.isArray(obj))
          obj.forEach(child => treeToListLoop( obj[child], [...acc, child]))
      else if (typeof obj == "string")
        original.push([...acc, obj])
      else
        original.push([...acc])
    }

    treeToListLoop(obj)
    return original
  },

  /*
  Opposite to treeToList(), this function will assemble a list of prop names into an object.
    Example:
    Passing an object [[a,b], [a,c]]
    would return {a: {b: 1, c: 2}}
  */

  listToTree (list) {
    const tree = {}

    const listToTreeLoop = (path, curr, original) => {
      path = [...path]
      const newKey = path.shift()
      if (path.length>1) {
        if (!curr[newKey]) {
          curr[newKey] = {}                
        }
      return listToTreeLoop(path, curr[newKey], original)
      } else {
        curr[newKey] = path.shift()
        return original
      }
    }
    list.forEach( path => {
      listToTreeLoop(path, tree, tree)
    })
    
    return tree
  },

  /*
    Takes an object that represents the branches of the tree and add the to each branches.
      Example:
      Assume a state of {b: {c: 2, d: 3}},
      passing addValueToTree({b: 'c'}, 4)
      will change the state to {a: 1, b: {c: 4, d: 3}}.
  */
  addValueToTree (obj, value) {
    const listFromTree = this.treeToList(obj)
    const mappedList = listFromTree.map( path => [...path, value])
    const tree = this.listToTree([...mappedList])
    return tree
  },

  /*
  Subscribe allows a callback to be called whenever the prop changes on the given store.
  */
  subscribe ( tree, callback, thisStore=this.store ) {
    const observedProps = this.treeToList(tree)
    observedProps.forEach( list => {
      const key = list.join('|')
      // const key = JSON.stringify(list)
      if(!this.sub[key]){
        this.sub[key] = []
      }
      this.sub[key].push(callback)
    })
  },

  /*
  Gets [x,y,z] and returns [[x],[x,y],[x,y,z]]. Useful for traversing trees.
  */
  expandList (array) {
    const expandedArray = []
    array.forEach( (item, idx) => {
      if( idx == 0 )
      expandedArray.push( [item] )
      else {
        const newItem = [...expandedArray[idx-1]]
        newItem.push(item)
        expandedArray.push(newItem)
      }
    })  
    return expandedArray
  },

  /*
  The primary way of changing values in the state. When state is changed via "set", the callbacks get properly activated.
  */
  set (arg, store = this.store) {
    const listOfPaths = []
    const setLoop = (obj, ref, path =[]) => Object.keys(obj).forEach( key => {
    // Check if it exists on store, otherwise create it
    if(!ref[key]) ref[key] = undefined
    // If it references an object, loop through its keys
    if(this.isObject(obj[key])) {
      path.push(key)
      setLoop(obj[key], store[key], path)
    }
    // If it is an array, substitute it
    else if(this.isArray(obj[key])) {
    if (ref[key] != [...obj[key]]) {
      listOfPaths.push([...path, key])
      ref[key] = [...obj[key]]
    } else console.log('was equal?')
    }
    // If it is scalar, substitute it
    else if (ref[key] != obj[key]) {
      listOfPaths.push([...path, key])
      ref[key] = obj[key]
    }
    else console.log('was equal?')
  })
    setLoop( arg, store)
    console.log('..listOfPaths', listOfPaths)
    this.doCallbacks( listOfPaths, store )
  },

  /*
  Runs callbacks subscribed under the arguments.
    Example:
    If ['country', 'state', 'town'] is passed as argument, all callbacks registered
    under "country", "country|state" and "country|state|town" get called.
  */
  doCallbacks( listOfArgs, store=this.store) {
    const expandedListRepeated = listOfArgs.map( list => this.expandList(list))
    const expandedList = [...new Set(expandedListRepeated)]
    expandedList.forEach( fullList => fullList.forEach( list => {
      const key = list.join('|')
      // const key = JSON.stringify(list)
      if( this.sub[key] ){
        const reached = this.reach(list)
      this.sub[key].forEach( func => func && func(reached.target[reached.prop]))
    }
    }))
  },

  /*
  Hooks up so that any change to a variable "from" is send through "callback"
  and set to state field "to". It is mainly meant from collecting input from user
  and automatically setting it to state. 
  */
  push(from, to, callback = x => x){
    if( from.target instanceof HTMLElement ) {
      let events = from.event || ['change', 'input']
      if( typeof from.event == 'string')
        events = [from.event]
      events.forEach( event => 
        from.target.addEventListener(event, e => {
          const callbackArg = e.target['value'] || e.target.innerHTML
          const callbackResult = callback(callbackArg)
          this.set(this.addValueToTree(to, callbackResult))
        })
      )
    } else {
      Object.defineProperty(
        from.target,
        from.prop,
        {
          set: value => {
          const listOfPaths = this.treeToList(to).map( list => [...list, callback(value)])
          const newTree = this.listToTree(listOfPaths)
          raven.set(newTree)
        
          from.target[`${this.prefix}${from.prop}`]=value
          },
          get: () => from.target[`${this.prefix}${from.prop}`]
        }
      )
    }
  },

  /*
  Hooks up so that any change to state field "from" goes through "callback"
  and is reflected to variable "to". It is mainly meant for data binding.
  */
  pull(from, to, callback = x => x){
    this.subscribe(from, value => to.target[to.prop] = callback(value))
  },

  /*
  A combination of push and pull. It allows change in a variable
  (let's say, an input) to be pushed up to store, and any changes to store
  to be passed down.
  */
  sync(stateTree, obj, callbackToTree, callbackToObject){
    this.pull(stateTree, obj, callbackToObject)
    this.push(obj, stateTree, callbackToTree)
  }
} 

export default raven
