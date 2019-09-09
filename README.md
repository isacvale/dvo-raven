## Preparing your store
Create a single object containing all your state. You may write it in different objects, but must assemble them in order to be loaded in raven.

To do so, use the command raven.load(), as in the example below.

    const myState = {
      location: {
        country: 'Italy',
        city: 'Rome'
      },
      personal: {
        name: 'Vivian',
        favoriteColor: 'yellow',
        dislikes: [
          "loud noise",
          "veggies"
        ]
      }

    raven.load(myState)

## Writing the callbacks
The callbacks contain much of the logic of the application. They tend to be very short functions that manipulate the DOM.
For example,

    const warnOfColorChange = () => document.querySelector('#warn-output')
    .textContent = "The color has changed!"

## Registering callbacks
When a callback is registered to a property of your state, that callback will fire whenever a change is observed on the target property.

To register a callback, use raven.register() passing an object to represent which properties to watch and the callback function. In the example below, the callback will run whenever the favoriteColor is modified.

    const callback = (value, old) => 
      console.log(`The favorite color change from ${old} to ${value}.`)

    raven.register({
      personal: 'favoriteColor'
      },
      callback
    )
    
There are some important things to aware of:
1. the object argument has the name of the argument to listen **as a string**, so to watch "bar" in {foo: {bar: 42}}, you'd pass {foo: 'bar'}.
1. Many variables to watch may be passed in a single csll. The callback would run whenever any of those change.
1. The callback will receive two arguments, the new and the old 

### Changing state on complex data
You may associate callbacks to entire objects instead of its particular properties. This means a callback will fire if any of its properties are changed.
Extending the example above, we could rig callback to fire when any dislikes changes by subscribing:

    raven.register({personal: "dislikes"}, callback)

### Subscribing root properties
Because you can't create a JS object with a key without value, subscribing a root property is a bit of a gotcha. There's two ways to do it:

1. You can pass it as a string. For example raven.subscribe("personal", callback) would run whenever any personal prop changed.
1. If you need to pass an object, you can just assign it any value other than an object or a string - we recommend 0. So raven.subscribe({personal: 0}, callback) would work just fine.


## Changing state
To change state, use the method raven.set() passing as parameter an object representing the branches that were modified.
For example, consider the call

    raven.set({
      location: {
        country: 'Scotland',
        city: 'Edinburgh'
      }
    })

This will change the state in two positions, country and city, and all callbacks associated with both field will be executed.

