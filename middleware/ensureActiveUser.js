const User = require("../models/userModel");

exports.ensureActiveUser = async (req, res, next) => {

  try {

    if (!req.session.user) {
      return res.redirect("/auth/login");
    }

    const user = await User.findById(
      req.session.user.id
    );

    if (!user || user.status === "inactive") {

      delete req.session.user;

      return res.redirect(
        "/login?error=account_blocked"
      );
    }

    next();

  }

  catch (err) {

    console.log(err);

    return res.redirect("/auth/login");

  }

};