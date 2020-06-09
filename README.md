# Raven

**Raven** is a tool to manage state and do data-binding in JS vanilla applications.

It allows you to keep the state of your application in a single place (aka. the store) and allows you to attach callbacks that execute when changes happen to any particular piece of data.

It also allows you to link DOM elements to any piece os data in the store, so the changes to the store are reflected on the DOM and vice-versa.

Because the store doesn't rely on getters and setters, it is easy to inspect and easily detect changes to deeply nested properties, including arrays and objects.

## How to pass references
Because in javascript arguments are "passed by value", references to an object or DOM elements property are made through an object with a _target_ and a _prop_ properties. We'll call it `reference by object`.

For example, consider the following object:
```javascript
const store = {
  keyA: {
    keyB: {
      keyC: 'value'
    }
  }
}
```
To make a reference to value, you'd do:
```javascript
const reference = {
  target: store.keyA.keyB,
  prop: keyC
}
```
There is a second, easier way to pass the reference: as a string of period separated props. We'll call it `reference by string`. The same reference as above could be writen as:
```javascript
const reference = 'keyA.keyB.keyC'
```
## How to use Raven

### ⚬ Import
**Raven** is an ES6 module.
```javascript
import raven from './node_modules/@dvo/raven/lib/index.js'
```

### ⚬ Create a store and load it to raven
```javascript
const store = {
  a: []
  b: {
    c: 0, d: 0
  }
}
raven.load(store)
```
### ⚬ Setting values
Once a store is loaded, you nee to call `raven.set` to change values (directly changing them would not fire any callback).
In the example below, we'd set the "c" property of the store above to 10 using `reference by string`:
```javascript
raven.set('b.c', 10)
```
Alternatively, if you pass a `reference by object`, you can change multiple properties to different values in one go:
```javascript
raven.set({
  a: [1, 2, 3]
  b: { c: 10 }
})
```

### ⚬ Subscribing callbacks
You can subscribe callbacks to run when any particular piece of data within the store is changed. The example below would output the new value of "c" whenever it changed - in this case, it'd log hello world".
```javascript
raven.callback('b.c', console.log)
raven.set('b.c', 'hello world')
// Logs 'hello world'
```
If you subscribe a callback to a prop, any changes to its value - no matter how deep - will trigger the callback. So in the example below, note how one change to the store can trigger multiple callbacks:

```javascript
raven.callback('b', console.log)
raven.callback('b.c', console.log)
raven.set('b.c', 'hello world')
// Logs 'hello world'
// Logs { c: 'hello world' }
```
_(For future-proofing, you should not rely on the order of execution of the callbacks.)_

### ⚬ Clearing subscriptions
You can clear all subscriptions by calling:
```javascript
raven.clear()
```
If you pass a `reference by string` or array such references, all callbacks attached to those properties are forgotten.
```javascript
raven.clear(['b', 'b.c'])
```
If you pass a function or array of functions, any instance of that function registerd as a callback will be forgotten, no matter to what property it is attached to.
```javascript
raven.clear(console.log)
```
You could pass arrays containing both `reference by string` and functions.

### ⚬ Pushing values
To "push" means sending the value of an input up to the store, dynamically. Doing so requires you pass DOM element `referenced by object`, and then the property of the store, usually `referenced by string`. In the example below, we'll push any value typed on the input to the prop 'd' of the store.
```javascript
raven.push({
  target: document.querySelector('input[type="text"]')
  prop: 'value'
},
  'b.d'
)
```
`Raven.push` takes an optional third parameter: a function that will receive and process the value of the input before setting it to the store. For example:
```javascript
raven.push({
  target: document.querySelector('input[type="text"]')
  prop: 'value
},
  'b.d',
  Number
)
// Whatever the user types into the input gets coerced into a number.
```
_(Push has a fourth and fith optional arguments for dependency injection for testing purposes. Normal use dispenses them.)_

### ⚬ Pulling values
To "pull" means sending the value from the store back to a DOM element. Doing so requires referencing the property of the store (usually a `reference by string`) and then the DOM element, `referenced by object`. In the example below we'll pull the prop "d" of the store into the `<h1>` of the page.
```javascript
raven.pull(
  'b.d',
  {
    target: document.querySelector('h1')
    prop: 'textContent'
  }
)
```
`Raven.pull` takes an optional third parameter: a function that will receive and process the value of the store before pulling it into the DOM element. For example:
```javascript
raven.pull({
  target: document.querySelector('input[type="text"]')
  prop: 'value
},
  'b.d',
  value => `USD $${value},00`
)
// Any value in the prop "d" will be masked into a currency notation before put in the <h1>.
```
_(Pull has a fourth optional argument for dependency injection for testing purposes. Normal use dispenses it.)_

### ⚬ Syncing an element to a store property
Push and pull are often used together to create "controlled forms", which means: the input displays the value from the store, and any change to the input is reflected to the store. This very common use has its own shortcut in `Raven.sync`.

It takes the property of the store (usually a `reference by string`) and the element (`reference by object`), setting both pull and push for you. For example:
```javascript
raven.sync(
  'b.d',
  {
    target: document.querySelector('input[type="text"]')
    prop: 'value
  }
)
```
`Raven.sync` takes optional third and fourth parameters. The third is the intermediate function to format the value as it is pushed up to the store and the fourth is the intermediate function to format the value as it is pulled down to the input. For example:
```javascript
raven.sync(
  'b.d',
  {
    target: document.querySelector('input[type="text"]')
    prop: 'value
  },
  value => value.slice(4),
  value => `USD $${value}`
)
```
