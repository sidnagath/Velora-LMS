exports.isUserGuest =
(req, res, next) => {

  if (req.session.user) {

    return res.redirect(
      "/user-dashboard"
    );

  }

  if (req.session.admin) {

    return res.redirect(
      "/admin-dashboard"
    );

  }

  next();

};