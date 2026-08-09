exports.getAdminLogout = (req, res) => {
  delete req.session.admin;

  req.session.save((err) => {
    if (err) {
      console.log(err);
      return res.redirect("/auth/admin-login");
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.redirect("/auth/admin-login");
  });
};
