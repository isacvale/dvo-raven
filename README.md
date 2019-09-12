# Raven

## Overview
### What it does
Raven is a way to keep state and do data binding. It was made for sites/apps developed in vanilla, without frameworks.

### How to use it
After calling raven.**load**() and passing it your app's state as a single object, you can call the following methods:
1. **subscribe**(*obj*, *callback*) runs the given callback when the variables indicated by obj change.
1. **set**(*obj*) is how you change the state of yout app. Changing it directly won't fire callbacks.
1. **push**(*from*, *to*, *func*) makes it so every change to variable "from" is reflected up to state field "to", after passing through function "func".
1. **pull**(*from*,*to*, *func*) makes it so every change to state field "from" is reflected down to variable "to", after passing through function "func".
1. **sync**(*state*,*var*,*statefunc*,*varfunc*) makes it so any changes to store or variable are reflected on each other, having passed through a given function.

---

## How to reference state variables
In Raven, you reference your state variables by passing an object that mirrors the "path" to that variable. For example, suppose you want to give a value to the variable "answer" in the state below:

    state = {
      universe: {
        answer: null,
        question: null
      }
    }

You'd do:

    raven.set({universe: {answer: 42}})

So far, so simple. But suppose you want to *reference* the variable, and *not provide* the value. In this case, the name of the variable is passed as a string, and no value is passed. For example, to subscribe a callback for changes to variable "answer", you'd do:

    raven.subscribe({universe: "answer"}, callbackFunction)

The advantage using objets for referencing that you can point to multiple state properties at once. For example, if you wanted to subscribe to changes to both question and answer in the example above, you'd do:

    raven.subscribe({universe: ["answer", "question"]}, callbackFunction)

And there's still a third way to do references. If the variable you're after is not in the state, you must pass a reference to its parent object and it's property name. For example, to push up the value from input, you could do:

    raven.push({
        target: document.querySelector("#arthurs-brain"),
        prop: "value"
      },
      { universe: "question" }
    )

Once you take in these referencing rules, using raven will be easy-peasy.

---
## A deeper view
### Preparing your store
Create a single object containing all your state. You may write it in different objects, but must assemble them in order to be loaded into raven.

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

### Writing the callbacks
The callbacks contain much of the logic of the application. They tend to be very short functions that manipulate the DOM. For example,

    const warnOfColorChange = () => document.querySelector('#warn-output')
    .textContent = "The color has changed!"

### Registering callbacks
When a callback is registered to a property of your state, that callback will fire whenever a change is observed on the target property.

To register a callback, use raven.register() passing an object to represent which properties to watch and the callback function. In the example below, the callback will run whenever the favoriteColor is modified.

    const callback = (value, old) => 
      console.log(`The favorite color change from ${old} to ${value}.`)

    raven.register({
      personal: 'favoriteColor'
      },
      callback
    )
    
There are some important things to be aware of:
1. the object argument has the name of the argument to listen **as a string**, so to watch "bar" in {foo: {bar: 42}}, you'd pass {foo: 'bar'}.
1. Many variables to watch may be passed in a single call. The callback would run whenever any of those change.
1. The callback will receive as argument the new value.

#### Changing state on complex data
You may associate callbacks to entire objects instead of its particular properties. This means a callback will fire if any of its properties are changed.
Extending the example above, we could rig callback to fire when any dislikes changes by subscribing:

    raven.register({personal: "dislikes"}, callback)

#### Subscribing root properties
Because you can't create a JS object with a key without value, subscribing a root property is a bit of a gotcha. There's two ways to do it:

1. You can pass it as a string. For example raven.subscribe("personal", callback) would run whenever any personal prop changed.
1. If you need to pass an object, you can just assign it any value other than an object, array or a string - we recommend 0. So raven.subscribe({personal: 0}, callback) would work just fine.


## Changing state
To change state, use the method raven.set() passing as parameter an object representing the branches that were modified.
For example, consider the call

    raven.set({
      location: {
        country: 'Scotland',
        city: 'Edinburgh'
      }
    })

This will change the state in two positions, country and city, and all callbacks associated with both field will be executed. In fact, any callbacks rigged to 'location' would also fire (once).

