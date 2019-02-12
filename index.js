export default {
  sub: new Map(),
  setSetter: function( target, prop, cbkFunc ){
    Object.defineProperty( target, `_HuginnAndMuninnAreWatching${prop}`, {
      enumerable: false
    })
    Object.defineProperty( target, prop, {
      set: value => {
        this.sub.get(target)[prop].forEach( func => func() )
        target[`_HuginnAndMuninnAreWatching${prop}`] = value
      },
      get: () => {
        return target[`_HuginnAndMuninnAreWatching${prop}`]
      }
    })
  },
  subscribe( target, prop, cbkFunc ){
    target[`_HuginnAndMuninnAreWatching${prop}`] = target[prop]
    if( !this.sub.has( target ) ) this.sub.set( target, {} )
    if( !this.sub.get( target )[prop] ) this.sub.get( target )[prop]=[]
    this.sub.get( target )[prop].push( cbkFunc )
    this.setSetter( target, prop, cbkFunc )
  },
  unsubscribe: function(){
    return function ( obj = "_all", prop = "_all", func = "_all" ) {
      for( let objRef of this.sub.keys() ){
        if( obj == objRef || obj == "_all" ){
          for( let propName of Object.keys( this.sub.get(objRef) ) ){
            if( prop == propName || prop == "_all" ){
              for( let funcRef of this.sub.get(objRef)[propName] ){
                if( func == funcRef.name || func == funcRef || func == "_all" ){ // unsubscribe code

                  if( func == "_all" )
                    this.sub.get(objRef)[propName] = []
                  else
                    this.sub.get(objRef)[propName] = arrayWithout( this.sub.get(objRef)[propName], funcRef )

                } // end of unsubscribe code
              }
            }
          }
        }
      }
    }.bind(this)() //close unsubscribe
  },
  arrayWithout: function ( arrayRef, itemRef ){
    return arrayRef.filter( function(item){
      return item !== itemRef
    } )
  }
}
