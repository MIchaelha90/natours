//wrap async function with try catch in the tour controller
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err)); // can also just put "next" in.
  };
};
