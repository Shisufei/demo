/**
 * author:ShiSufei
 * time:2020/05/12 16:16
 * editRecord:
 *     2020/05/13 10:35 例用Symbol将triggerResolve、triggerFulfilled、triggerReject改为了私有方法
 *     2020/05/13 15:32 增加“如果promise和x指向同一对象，以TypeError为据因拒绝执行promise”
 */
const  triggerResolve = Symbol('triggerResolve')
const  triggerFulfilled = Symbol('triggerFulfilled')
const  triggerReject = Symbol('triggerReject')

class myPromise {
  constructor(handleFunc) {
    this.status = 'pending'
    this.value = undefined
    this.fulfilledList = []
    this.rejectedList = []

    handleFunc(this[triggerResolve].bind(this), this[triggerReject].bind(this))
  }

  [triggerResolve] (val) {
    setTimeout(() => {
      if (this.status !== 'pending') return
      if (val instanceof myPromise) {
        val.then(
          value => { },
          err => { }
        )
      } else { // resolve 方法传入的是普通值
        this.status = 'fulfilled'
        this.value = val
        this[triggerFulfilled](val)
      }
    }, 0)
  }

  [triggerFulfilled] (val) { // val ??
    this.fulfilledList.forEach(item => item(val))
    this.fulfilledList = []
  }

  [triggerReject] (val) {
    this.rejectedList.forEach(item => item(val))
    this.rejectedList = []
  }

  then (onFulfilled, onRejected) {
    const { value, status } = this // this指向new出来的实例
    const promiseInstance = new myPromise((onNextFulfilled, onNextRejected) => {

      function onFinalFulfilled (val) { // 内部闭包函数
        if (typeof onFulfilled !== 'function') { // onFulfilled不是个函数，则直接执行下一个promise
          onNextFulfilled(val)
        } else { // onFulfilled是个函数
          const res = onFulfilled(val) // 先执行这一步回调的结果

          // 如果promise和x指向同一对象，以TypeError为据因拒绝执行promise
          if( res === promiseInstance){
            throw new TypeError('')
          }

          if (res instanceof myPromise) { // res返回了一个promise，则通过这个res的状态来执行下一个promise的状态
            res.then(onNextFulfilled, onNextRejected) // res为resolve状态则执行下一个promise的resolve状态
          } else { // res返回了一个普通值，比如字符串等
            onNextFulfilled(res) // 把res的返回值代入下一个promise的resolve回调
          }
        }
      }

      function onFinalRejected (error) {
        if (typeof onRejected !== 'function') {
          onNextRejected(error)
        } else {
          let res = null
          try {
            res = onRejected(error)
          } catch (e) {
            onNextRejected(e)
          }

          if (res instanceof myPromise) {
            res.then(onNextFulfilled, onNextRejected)
          } else {
            onNextRejected(res)
          }
        }
      }

      switch (status) {
        case 'pending': {
          this.fulfilledList.push(onFinalFulfilled) // ??
          this.rejectedList.push(onFinalRejected)
          break
        }
        // 因为then可以被多次调用，所以严谨的可以再加case
        case 'fulfilled': { // 比如先变成了resolve状态之后，再注册的回调
          onFinalFulfilled(value)
          break
        }
      }
    })
    return promiseInstance
  }
  catch (onRejected) {
    return this.then(null, onRejected)
  }

  static resolve (value) {
    if (value instanceof myPromise) return value
    return new myPromise(resolve => resolve(value))
  }
  static reject () {

  }
  static all (list) {
    return new myPromise((resolve, reject) => {
      let count = 0
      const values = []
      for (const [i, promiseInstance] of list.entries()) { // for...of...在这里是并行的（同步进行），在async await里是异步的
        this.resolve(promiseInstance) // 也可以写 promiseInstance,但这样写更好，这样写是为了把它先包裹成一个promise，防止当其中一个不是promise 的时候报错
          .then(res => {
            values[i] = res // 用下标记录每一个返回的结果
            count++
            if (count === list.length) resolve(values)
          }, err => {
            reject(err)
          })
      }
      // 也可以把 for...of... 写成 forEach的形式，如下：
      // list.forEach((promiseInstance,i)=>{
      //   myPromise.resolve(promiseInstance)
      //     .then(res=>{
      //       values[i] = res
      //       count++
      //       if (count === list.length) resolve(values)
      //     }, err => {
      //       reject(err)
      //     })
      // })

    })
  }
  static race (list) {
    return new myPromise((resolve, reject) => {
      for (const [i, promiseInstance] of list.entries()) {
        this.resolve(promiseInstance)
          .then(res => {
            resolve(res)
          }, err => {
            reject(err)
          })
      }
      // 或者 forEach的形式，如下：
      // list.forEach(item => {
      //   myPromise.resolve(item)
      //     .then(res => {
      //       resolve(res)
      //     }, err => {
      //       reject(err)
      //     })
      // })
    })
  }
}

module.exports = myPromise