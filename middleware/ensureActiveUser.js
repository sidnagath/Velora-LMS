import User from '../models/userModel.js';


export const ensureActiveUser = async (req, res, next) => {

  try {

    if (!req.session.user) {
      return res.redirect("/auth/login");
    }

    const user = await User.findById(
      req.session.user.id
    );

    if (!user || user.status === "inactive" || user.isDeleted) {
      delete req.session.user;
      if (req.session.passport) {
        delete req.session.passport.user;
      }
      return res.redirect("/account-blocked");
    }

    next();

  }

  catch (err) {

    console.log(err);

    return res.redirect("/auth/login");

  }

};

export default {
  ensureActiveUser
};
