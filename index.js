export default {
  setSetter: function( target, prop, cbkFunc ){
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
  sub: new Map()
}
