const mongoose = require('mongoose');
const Coupon = require('../models/couponModel');

class CouponService{

  async getCoupons(query) {
    try {
      const search = query.search?.trim() || "";
      const filterStatus = query.status?.trim() || "";
      const sortBy = query.sortBy || "newest";

      // PAGE
      const page = Number(query.page) || 1;
      const LIMIT = 10;
      const skip = (page - 1) * LIMIT;

      // BUILD FILTER
      const filter = {};
      if (search) {
        filter.code = { $regex: search, $options: "i" };
      }
      
      if (filterStatus) {
        filter.status = filterStatus;
      }

      // BUILD SORT
      const sortMap = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        codeAZ: { code: 1 },
        codeZA: { code: -1 },
        expirySoon: { expiryDate: 1 },
        expiryLast: { expiryDate: -1 }
      };
      const sort = sortMap[sortBy] || { createdAt: -1 }; 
        
      // QUERY
      const [coupons, totalCoupons] = await Promise.all([
        Coupon.find(filter).sort(sort).skip(skip).limit(LIMIT).lean(),
        Coupon.countDocuments(filter)
      ]);

      // Handle Expired visual check (optional)
      const now = new Date();
      coupons.forEach(coupon => {
        if (coupon.status === 'active' && new Date(coupon.expiryDate) < now) {
          coupon.status = 'expired';
        }
      });

      const totalPages = Math.ceil(totalCoupons / LIMIT) || 1;

      const Order = require('../models/orderModel');
      const [activeCouponsCount, redeemedAgg, revenueAgg] = await Promise.all([
        Coupon.countDocuments({ status: 'active', expiryDate: { $gt: now } }),
        Coupon.aggregate([{ $group: { _id: null, total: { $sum: "$usageCount" } } }]),
        Order.aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: null, totalSaved: { $sum: "$couponDiscount" } } }
        ])
      ]);

      const totalRedeemedCount = redeemedAgg[0]?.total || 0;
      const totalRevenueSaved = revenueAgg[0]?.totalSaved || 0;

      return {
        success: true,
        data: {
          coupons,
          search,
          currentPage: page,
          totalPages,
          totalCoupons,
          LIMIT,
          filterStatus,
          sortBy,
          activeCouponsCount,
          totalRedeemedCount,
          totalRevenueSaved
        }
      };
    } catch (err) {
      console.error(err);
      return { success: false, errors: { general: "Something went wrong. Please try again." } };
    }
  }

  async getActiveCoupons() {
    try {
      const now = new Date();
      const coupons = await Coupon.find({
        status: "active",
        expiryDate: { $gt: now },
        $expr: { $lt: ["$usageCount", "$usageLimit"] }
      }).sort({ createdAt: -1 }).lean();

      return { success: true, coupons };
    } catch (err) {
      console.error(err);
      return { success: false, errors: { general: "Failed to fetch coupons" } };
    }
  }

  async getCreateCouponData() {
    return {
      success: true
    }
  }

  async postCreateCouponData(body) {
    try {
      let {
        code,
        discountType,
        discountValue,
        minOrderValue,
        maxDiscountAmount,
        usageLimit,
        expiryDate,
        status,
      } = body;

      // ===========================
      // Sanitize Inputs
      // ===========================
      code = code?.trim().toUpperCase();
      discountType = discountType?.trim().toLowerCase() || "percentage";
      discountValue = Number(discountValue);
      minOrderValue = Number(minOrderValue) || 0;
      maxDiscountAmount = Number(maxDiscountAmount) || 0;
      let rawUsageLimit = body.usageLimit;
      status = status?.trim() || "active";

      const formData = {
        code,
        discountType,
        discountValue,
        minOrderValue,
        maxDiscountAmount,
        usageLimit: rawUsageLimit,
        expiryDate,
        status,
      };

      let errors = {};

      // ===========================
      // Validation
      // ===========================
      if (!code) {
        errors.code = "Coupon code is required";
      } else if (code.length < 5) {
        errors.code = "Coupon code must be at least 5 characters";
      } else {
        const existing = await Coupon.findOne({ code });
        if (existing) {
          errors.code = "Coupon code already exists";
        }
      }

      if (!["percentage", "flat"].includes(discountType)) {
        errors.discountType = "Invalid discount type";
      }

      if (isNaN(discountValue) || discountValue <= 0) {
        errors.discountValue = "Discount value must be greater than 0";
      }

      if (discountType === "percentage" && discountValue >= 100) {
        errors.discountValue = "Percentage discount must be less than 100%";
      }

      if (discountType === "flat" && minOrderValue > 0 && discountValue >= minOrderValue) {
        errors.discountValue = "Flat discount must be less than the minimum order value";
      }

      if (isNaN(minOrderValue) || minOrderValue <= 0) {
        errors.minOrderValue = "Minimum order value must be greater than 0";
      }

      if (discountType === "flat") {
        maxDiscountAmount = 0;
      } else if (isNaN(maxDiscountAmount) || maxDiscountAmount <= 0) {
        errors.maxDiscountAmount = "Maximum discount amount must be greater than 0";
      }

      if (!expiryDate) {
        errors.expiryDate = "Expiry date is required";
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        if (expiry < today) {
          errors.expiryDate = "Expiry date cannot be in the past";
        }
      }

      if (!["active", "inactive"].includes(status)) {
        errors.status = "Invalid status";
      }

      if (!rawUsageLimit || rawUsageLimit.toString().trim() === "") {
        errors.usageLimit = "Usage Limit is required";
      } else {
        const num = Number(rawUsageLimit);
        if (isNaN(num) || num <= 0) {
          errors.usageLimit = "Usage Limit must be greater than 0";
        } else if (num > 100) {
          errors.usageLimit = "Usage Limit cannot exceed more than 100";
        } else if (!Number.isInteger(num)) {
          errors.usageLimit = "Usage Limit must be a whole number";
        } else {
          usageLimit = num;
        }
      }
     
      if (Object.keys(errors).length > 0) {
        return { success: false, errors, formData };
      }

      await Coupon.create({
        code, 
        discountType,
        discountValue, 
        minOrderValue,
        maxDiscount: maxDiscountAmount,
        usageLimit,
        expiryDate,
        status
      });

      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, errors: { general: "Something went wrong. Please try again." }, formData: body };
    }
  }

  async getEditCouponData(id) {

    const coupon=await Coupon.findById(id);

    if(!coupon){
      return {
        success:false,
        message:"Coupon not found"
      }
    }
      return {
      success: true,
      coupon:coupon
    }
  }
  

    async postEditCouponData(id,body) {
     try {
      let {
        code,
        discountType,
        discountValue,
        minOrderValue,
        maxDiscountAmount,
        expiryDate,
        usageLimit,
        status
      } = body;

      // ===========================
      // Sanitize Inputs
      // ===========================
      code = code?.trim().toUpperCase();
      discountType = discountType?.trim().toLowerCase() || "percentage";
      discountValue = Number(discountValue);
      minOrderValue = Number(minOrderValue) || 0;
      maxDiscountAmount = Number(maxDiscountAmount) || 0;
      let rawUsageLimit = body.usageLimit;
      status = status?.trim() || "active";

      const formData = {
        code,
        discountType,
        discountValue,
        minOrderValue,
        maxDiscountAmount,
        expiryDate,
        usageLimit: rawUsageLimit,
        status,
      };

      
      const coupon=await Coupon.findById(id);
      if (!coupon) return { success: false, message: "Coupon is not found" };

      let errors = {};

      // ===========================
      // Validation
      // ===========================
      if (!code) {
        errors.code = "Coupon code is required";
      } else if (code.length < 5) {
        errors.code = "Coupon code must be at least 5 characters";
      }else {
       const existing = await Coupon.findOne({
              code,
              _id: { $ne: id }
            });

        if (existing) {
          errors.code = "Coupon code already exists";
        }
      }
      

      if (!["percentage", "flat"].includes(discountType)) {
        errors.discountType = "Invalid discount type";
      }

      if (isNaN(discountValue) || discountValue <= 0) {
        errors.discountValue = "Discount value must be greater than 0";
      }

      if (discountType === "percentage" && discountValue >= 100) {
        errors.discountValue = "Percentage discount must be less than 100%";
      }

      if (discountType === "flat" && minOrderValue > 0 && discountValue >= minOrderValue) {
        errors.discountValue = "Flat discount must be less than the minimum order value";
      }

      if (isNaN(minOrderValue) || minOrderValue <= 0) {
        errors.minOrderValue = "Minimum order value must be greater than 0";
      }

      if (discountType === "flat") {
        maxDiscountAmount = 0;
      } else if (isNaN(maxDiscountAmount) || maxDiscountAmount <= 0) {
        errors.maxDiscountAmount = "Maximum discount amount must be greater than 0";
      }

      if (!expiryDate) {
        errors.expiryDate = "Expiry date is required";
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        
        // Only validate if it's different from the existing date
        const existingExpiryStr = new Date(coupon.expiryDate).toISOString().split('T')[0];
        const newExpiryStr = expiry.toISOString().split('T')[0];

        if (newExpiryStr !== existingExpiryStr && expiry < today) {
          errors.expiryDate = "Expiry date cannot be in the past";
        }
      }

      if (!["active", "inactive"].includes(status)) {
        errors.status = "Invalid status";
      }

      if (!rawUsageLimit || rawUsageLimit.toString().trim() === "") {
        errors.usageLimit = "Usage Limit is required";
      } else {
        const num = Number(rawUsageLimit);
        if (isNaN(num) || num <= 0) {
          errors.usageLimit = "Usage Limit must be greater than 0";
        } else if (num > 100) {
          errors.usageLimit = "Usage Limit cannot exceed more than 100";
        } else if (!Number.isInteger(num)) {
          errors.usageLimit = "Usage Limit must be a whole number";
        } else {
          usageLimit = num;
        }
      }

      if (Object.keys(errors).length > 0) {
        return { success: false, errors, formData };
      }

       coupon.code = code;
       coupon.discountType = discountType;
       coupon.discountValue = discountValue;
       coupon.minOrderValue = minOrderValue;
       coupon.maxDiscount = maxDiscountAmount;
       coupon.expiryDate = expiryDate;
       coupon.usageLimit=usageLimit;
       
       // Ensure status goes inactive if limit is reduced below current usage
       if (status === "active" && coupon.usageCount >= usageLimit) {
         coupon.status = "inactive";
       } else {
         coupon.status = status;
       }

      await coupon.save();

      return { success: true, message: "Coupon updated successfully" };
    } catch (err) {
      console.error(err);
      return { success: false, errors: { general: "Something went wrong. Please try again." }, formData: body };
    }
  }

  async deleteCouponData(couponId) {
    try {
      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        return { success: false, message: "Coupon not found" };
      }
      
      await Coupon.findByIdAndDelete(couponId);
      
      return { success: true, message: "Coupon deleted successfully" };
    } catch (err) {
      console.error(err);
      return { success: false, message: "An error occurred while deleting the coupon" };
    }
  }
}

module.exports = new CouponService();