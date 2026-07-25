const couponService = require('../../services/couponService');

exports.getAdminCoupons = async (req, res) => {

  const result=await couponService.getCoupons(req.query);

  if(!result.success){
    return res.render("pages/admin/coupons/coupons",{
      title: "Velora - Coupon Management",
      isLoggedIn: true,
      isAdmin: true,
      courses: [],
      search: "",
      currentPage: 1,
      totalPages: 1,
      LIMIT: 10,
      filterStatus: "",
      sortBy: "newest",
      flashMsg: "",
      flashType: "success",
      errors: result.errors
    });
  }

  return res.render("pages/admin/coupons/coupons",{
    title: "Velora - Coupon Management",
    isLoggedIn: true,
    isAdmin: true,
    ...result.data,
    success: req.query.success || "",
    flashMsg: req.query.flashMsg ? decodeURIComponent(req.query.flashMsg) : "",
    flashType: req.query.flashType || "success",
    errors: {}
  });
  
};


exports.getAdminCreateCoupon = async (req, res) => {

  const result = await couponService.getCreateCouponData();

  if (!result.success) {
    return res.redirect("/admin-coupons?flashType=error&flashMsg=Could%20not%20load%20form");
  }
  
  res.render("pages/admin/coupons/create-coupon", {
    title: "Velora Admin - Create Coupon",
    isLoggedIn: true,
    activePage: "coupons",
    admin: req.session.admin || { email: 'admin@velora.com' },
    isAdmin: true,
    flashMessages: { success: null, error: null },
    formData: {},
    errors: {}
  });
};


exports.postAdminCreateCoupon = async (req, res) => {

  const result = await couponService.postCreateCouponData(req.body);

  if (!result.success) {
    return res.render("pages/admin/coupons/create-coupon", {
      title: "Velora Admin - Create Coupon",
      isLoggedIn: true,
      activePage: "coupons",
      admin: req.session.admin || { email: 'admin@velora.com' },
      isAdmin: true,
      flashMessages: { success: null, error: result.errors.general || "Please fix the errors below." },
      formData: result.formData || req.body,
      errors: result.errors
    });
  }

  return res.redirect("/admin-coupons?success=true&flashMsg=" + encodeURIComponent(result.message || "Coupon created successfully"));
};



exports.getAdminEditCoupon = async (req, res) => {

  const result = await couponService.getEditCouponData(req.params.couponId);

    if (!result.success) {
    return res.redirect("/admin-coupons?flashType=error&flashMsg=Could%20not%20load%20form");
  }

  res.render("pages/admin/coupons/edit-coupon", {
    title: "Velora Admin - Edit Coupon",
    activePage: "coupons",
    admin: req.session.admin || { email: 'admin@velora.com' },
    isAdmin: true,
    flashMessages: { success: null, error: null },
    errors: {},
    coupon:result.coupon
  });
};


exports.postAdminEditCoupon = async (req, res) => {

  const result = await couponService.postEditCouponData(req.params.couponId,req.body);

    if (!result.success) {
      return res.render("pages/admin/coupons/edit-coupon", {
        title: "Velora Admin - Edit Coupon",
        activePage: "coupons",
        admin: req.session.admin || { email: 'admin@velora.com' },
        isAdmin: true,
        flashMessages:{ success: null, error: result.errors?.general || "Please fix the errors below." },
        errors: result.errors || {},
        coupon: {
          _id: req.params.couponId,
          code: req.body.code || "",
          discountType: req.body.discountType || "percentage",
          discountValue: req.body.discountValue || "",
          minOrderValue: req.body.minOrderValue || "",
          maxDiscount: req.body.maxDiscountAmount || "",
          expiryDate: req.body.expiryDate || "",
          status: req.body.status || "active",
          description: req.body.code || "this promotional code"
        }
      });
  }
  
  return res.redirect("/admin-coupons?success=true&flashMsg=" + encodeURIComponent(result.message || "Coupon edited successfully"));
};

exports.postAdminDeleteCoupon = async (req, res) => {
  const result = await couponService.deleteCouponData(req.params.couponId);
  if (!result.success) {
    return res.redirect("/admin-coupons?flashType=error&flashMsg=" + encodeURIComponent(result.message || "Failed to delete coupon"));
  }
  return res.redirect("/admin-coupons?success=true&flashMsg=" + encodeURIComponent(result.message || "Coupon deleted successfully"));
};
