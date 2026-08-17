const Admin = require("../models/adminModel");

exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/auth/admin-login");
    }

    const adminId = req.session.admin._id || req.session.admin.id;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      delete req.session.admin;
      return res.redirect("/auth/admin-login");
    }
    
    next();
  } catch (err) {
    console.log(err);
    return res.redirect("/auth/admin-login");
  }
};