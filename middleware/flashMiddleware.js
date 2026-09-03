export const flashLocals = (req, res, next) => {
  res.locals.flashMessages = req.flash();
  next();
};


export default {
  flashLocals
};
