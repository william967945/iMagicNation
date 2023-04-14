exports.promisify = (func) => {
  if (typeof func !== "function") {
    return (req, res, next) => {
      next(new Error(`Promisify middleware does not see a function.`));
    };
  }

  return (req, res, next) => {
    try {
      let promise = func.call(this, req, res, next);
      if (promise instanceof Promise) {
        promise.then(
          (result) => {
            //Fulfillment
            return res.json(result);
          },
          (err) => {
            //Rejection
            next(err);
          }
        );
      } else {
        // Assume to be a Q-promise
        promise
          .then((result) => {
            return res.json(result);
          })
          .catch((err) => {
            next(err);
          });
      }
    } catch (exception) {
      next(exception);
    }
  };
};
