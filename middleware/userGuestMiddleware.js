export const isUserGuest = (req, res, next) => {

  if (req.session.user) {

    return res.redirect(
      "/user/dashboard"
    );

  }

  next();

};

export default {
  isUserGuest
};
