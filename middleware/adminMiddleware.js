exports.isAdmin = (req, res, next) => {
  if (req.session.admin) {
    return next();
  }
  
  if(req.session.user){
    return res.redirect("/user-dashboard")
  }

  res.redirect("/admin-login");
};