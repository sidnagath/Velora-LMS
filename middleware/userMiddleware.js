
exports.isUser = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  

  if(req.session.admin){
    return res.redirect("/admin-dashboard")
  }

  return res.redirect("/login");
};

