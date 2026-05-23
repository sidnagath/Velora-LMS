exports.isAdminGuest =
(req, res, next) => {

  if (req.session.admin) {

    return res.redirect(
      "/admin-dashboard"
    );

  }

  if (req.session.user) {

    return res.redirect(
      "/user-dashboard"
    );

  }

  next();

};