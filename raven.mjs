const raven = {

    /*
    Allows the registration of the store, so it doesn't have to be supplied constantly.
    */
    store: {},
    load( userStore ){
        this.store = userStore
    },

    /*
    An array will hold a reference to objects, arrays or scalars as a stringified array of prop keys.
    It also holds the corresponding list of callback functions to call when it detects changes.
    */
    sub: {},

    /*
    A prefix for getter/setter
    */
    prefix: "_",

    /*
    Util functions: get prop type
    */
    isArray (prop){
        return Array.isArray( prop )
    },
    isObject (prop){
        return typeof prop == "object" && !this.isArray( prop ) && prop != null
    },
    isScalar (prop){
        return !isObject && !isArray
    },


    /*
    Gets an array of strings and uses them to reach inside an object to return a nested property.
    */
    reach (arr, obj=this.store) {
        if(arr.length == 1)
            return {target:obj, prop: arr[0]}
        
        const newArray = [...arr],
              popped = newArray.shift(),
              nextObj = obj[popped]
        return this.reach(newArray, nextObj)
    },

    /*
    Takes an object and returns an array of arrays, each containing the strings to make up the branches of the object.
    */
    treeToList ( obj ) {
        let i=0
        const original = []

        const treeToListLoop = (obj, acc=[]) => {
            if (this.isObject(obj))
                Object.keys(obj).forEach( child =>
                    treeToListLoop( obj[child], [...acc, child])
                )
            else if (typeof obj == "string")
                original.push([...acc, obj])
            else
                original.push([...acc])
        }    
        treeToListLoop(obj)
        return original
    },
    listToTree (list) {
        const tree = {}

        const listToTreeLoop = (path, curr, original) => {
            path = [...path]
            const newKey = path.shift()
            if(path.length>1){
              if ( !curr[newKey] ) {
                curr[newKey] = {}                
              }
              return listToTreeLoop(path, curr[newKey], original)
            }
            else {
              curr[newKey] = path.shift()
              return original
            }
        }
        list.forEach( path => {
            listToTreeLoop(path, tree, tree)
        })
  
        return tree
    },
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
            const key = JSON.stringify(list)
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
    Uses getters and setters to make props reactive.
    Relies on closure on sub.
    Deprecated in favor of "set" method.
    */
//    reactToChange (list, store) {
//         // console.log( "list:", list)
//         // console.log( "reached:",  this.reach(list, store))
//         const reached = this.reach(list, store)
        
//         Object.defineProperty(
//             reached.target,
//             `${this.prefix}${reached.prop}`,
//             {
//                 enumerable: false,
//                 writable: true
//             }
//         )
//         reached.target[`${this.prefix}${reached.prop}`]=reached.target[`${reached.prop}`]

//         Object.defineProperty(
//             reached.target,
//             reached.prop,
//             {
//                 set: value => {
//                     const callbackArgs = {
//                         new: value,
//                         old: reached.target[`${this.prefix}${reached.prop}`]
//                     }
//                     const expandedList = this.expandList(list)
//                     expandedList.forEach(list => {
//                         const key = JSON.stringify(list)
//                         // console.log("key:", key)
//                         if( this.sub[key] )
//                             this.sub[key].forEach( callback => callback(callbackArgs) )
//                     })
//                     reached.target[`${this.prefix}${reached.prop}`]=value
//                 },
//                 get: () => reached.target[`${this.prefix}${reached.prop}`]
//             }
//         )
//     },

    /*
    Set given state to store. If payload is an object or array.
    */
    // setOriginal (arg, store = this.store) {  
    //     const setLoop = (obj, ref) => Object.keys(obj).forEach( key => {
    //         // Check if it exists on store, otherwise create it
    //         if(!ref[key]) ref[key] = undefined
    //         // If it references an object, loop through its keys
    //         if(this.isObject(obj[key]))
    //             setLoop(obj[key], store[key])
    //         // If it is an array, substitute it
    //         else if(this.isArray(obj[key]))
    //             ref[key] = [...obj[key]]
    //         // If it is scalar, substitute it
    //         else ref[key] = obj[key]
    //     })
    //     setLoop( arg, store)
    //     this.doCallbacksOriginal( arg, store )
    // },
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
                }
                else console.log('was equal?')
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
    Initiate callback
    */
    // doCallbacksOriginal( arg, store=this.store) {
    //     const listOfArgs = this.treeToList(arg)
    //     const expandedList = listOfArgs.map( list => this.expandList(list))
    //     expandedList.forEach( fullList => fullList.forEach( list => {
    //         const key = JSON.stringify(list)
    //         if( this.sub[key] ){
    //             const reached = this.reach(list)
    //             this.sub[key].forEach( func => func && func(reached.target[reached.prop]))
    //         }
    //     }))
    // },

    doCallbacks( listOfArgs, store=this.store) {
        const expandedList = listOfArgs.map( list => this.expandList(list))
        expandedList.forEach( fullList => fullList.forEach( list => {
            const key = JSON.stringify(list)
            if( this.sub[key] ){
                const reached = this.reach(list)
                this.sub[key].forEach( func => func && func(reached.target[reached.prop]))
            }
        }))
    },

    isSynced(obj1, obj2){
        const value1 = obj1.target[obj1.prop]
        const value2 = obj2.target[obj2.prop]
        const callback2 = obj2.callback || (x => x)
        if( callback2(value1) == value2 )
            return true
        return false
    },

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

    pull(from, to, callback = x => x){
        this.subscribe(from, value => to.target[to.prop] = callback(value))
    },

    sync(obj1, obj2){
        this.pull(obj1, obj2, obj1.callback)
        this.push(obj2, obj1, obj2.callback)
    }


    // const isPropSubscribed = (sub, prop, callback) => {
    //     const children = Object.keys( prop )
    //     children.forEach( child => {
    //         if(isScalar)
    //             sub[child] ? sub[child].push(child) : sub[child] = [child]
    //     })
    // }
} 

export default raven
