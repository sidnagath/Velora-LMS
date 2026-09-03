import HTTP_STATUS_CODES from '../../constants/statusCodes.js';
import couponService from '../../services/couponService.js';


export const getAdminCoupons = async (req, res) => {
  const result = await couponService.getCoupons(req.query);

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

export const getAdminCreateCoupon = async (req, res) => {
  const result = await couponService.getCreateCouponData();

  if (!result.success) {
    return res.redirect("/admin/coupons?flashType=error&flashMsg=Could%20not%20load%20form");
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

export const postAdminCreateCoupon = async (req, res) => {
  const result = await couponService.postCreateCouponData(req.body);

  if (!result.success) {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.errors.general || 'Failed to create coupon', errors: result.errors, formData: result.formData || req.body });
  }

  return res.status(HTTP_STATUS_CODES.CREATED).json({ success: true, message: result.message || "Coupon created successfully" });
};

export const getAdminEditCoupon = async (req, res) => {
  const result = await couponService.getEditCouponData(req.params.couponId);

    if (!result.success) {
    return res.redirect("/admin/coupons?flashType=error&flashMsg=Could%20not%20load%20form");
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

export const postAdminEditCoupon = async (req, res) => {
  const result = await couponService.postEditCouponData(req.params.couponId,req.body);

    if (!result.success) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.errors?.general || 'Failed to update coupon', errors: result.errors });
  }

  return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: result.message || "Coupon edited successfully" });
};

export const postAdminDeleteCoupon = async (req, res) => {
  const result = await couponService.deleteCouponData(req.params.couponId);
  if (!result.success) {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.message || "Failed to delete coupon" });
  }
  return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: result.message || "Coupon deleted successfully" });
};


export default {
  getAdminCoupons,
  getAdminCreateCoupon,
  postAdminCreateCoupon,
  getAdminEditCoupon,
  postAdminEditCoupon,
  postAdminDeleteCoupon
};
