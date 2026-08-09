exports.getUserLogout = (req, res) => {
  delete req.session.user;

  req.session.save((err) => {
    if (err) {
      console.log(err);
      return res.redirect("/auth/login");
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    req.flash("success", "Logged out successfully.");
    res.redirect("/auth/login");
  });
};
