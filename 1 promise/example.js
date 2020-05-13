const myPromise = require('./myPromise')

let promise = new myPromise((resolve, reject) => {
  setTimeout(function () {
      resolve('hello world');
  }, 3000);
});
promise.then( msg =>{
  console.log(msg);
  console.log(123);
})

promise.triggerFulfilled('test') // TypeError: promise.triggerFulfilled is not a function