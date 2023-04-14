var Q = require("q");

/**
 * Usage:
 *
 *   var index = 1;
 *   promiseWhile(function () { return index <= 11; }, function () {
 *     console.log(index);
 *     index++;
 *     return Q.delay(500); // arbitrary async
 *   }).then(function () {
 *    console.log("done");
 *   }).done();
 */
exports.promiseWhile = function (condition, body) {
  var done = Q.defer();

  function loop() {
    // When the result of calling `condition` is no longer true, we are
    // done.
    if (!condition()) return done.resolve();
    // Use `when`, in case `body` does not return a promise.
    // When it completes loop again otherwise, if it fails, reject the
    // done promise
    Q.when(body(), loop, done.reject);
  }
  // Start running the loop in the next tick so that this function is
  // completely async. It would be unexpected if `body` was called
  // synchronously the first time.
  Q.nextTick(loop);

  // The promise
  return done.promise;
};

// Usage
// var index = 1;
// function conditionP() {
//  var deferred = Q.defer();
//  Q.delay(500).then(function() {
//    deferred.resolve(index <= 5);
//  })
//  return deferred.promise;
// }
// function work() {
//   index++;
//   return Q.delay(500); // arbitrary async
// }
// promiseWhilePromise(conditionP, work).then(function () {
//   console.log('done');
// }).done();
//
// You cannot use .done() if you want to return result when all works done
exports.promiseWhilePromise = function (condition, body, options) {
  var deferred = Q.defer();
  var result = [];
  function loop(previousRes) {
    result.push(previousRes);
    // When the result of calling `condition` is no longer true, we are
    // done.

    var previous;
    if (options && options.passPrevious) {
      previous = previousRes;
    }
    condition().then(function (bool) {
      if (!bool) {
        result.shift();
        return deferred.resolve(result);
      } else {
        // Use `when`, in case `body` does not return a promise.
        // When it completes loop again otherwise, if it fails, reject the
        // done promise
        return Q.when(body(previous), loop, deferred.reject);
      }
    });
  }
  // Start running the loop in the next tick so that this function is
  // completely async. It would be unexpected if `body` was called
  // synchronously the first time.
  Q.nextTick(loop);

  // The promise
  return deferred.promise;
};

// Loop until the promise returned by `fn` returns a truthy value.
// example:
//    return promiseWhile.until(
//        function(previousRes) {
//          if (previousRes && previousRes.LastEvaluatedKey) {
//            options.ExclusiveStartKey = previousRes.LastEvaluatedKey;
//          }
//          return worker(businessId, startTs, endTs, switchTableId, options)
//        }
//    );
// worker 必須要回傳 done and value
//
//  var worker = function(businessId, startTs, endTs, switchTableId, options) {
//    return myNosql.wifilogs.query(businessId, startTs, endTs, switchTableId, options)
//    .then(function(result) {
//      if (result && result.LastEvaluatedKey) {
//        return {
//          done: false,
//          value: result
//        };
//      }
//      return {
//        done: true,
//        value: result
//      };
//    })
//  }
exports.until = function (fn, previousRes) {
  var self = this;

  return fn(previousRes).then(function (result) {
    if (result && result.done) {
      return result;
    } else {
      return self.until(fn, result.value);
    }
  });
};
