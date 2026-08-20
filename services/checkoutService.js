const cartService = require("./cartService");
const couponService = require("./couponService");

class CheckoutService {

  /**
   * Centralized, canonical calculation of checkout pricing:
   * 1. subtotal (gross base price sum)
   * 2. courseDiscount (sum of course level discounts)
   * 3. cartSubtotal = subtotal - courseDiscount
   * 4. couponDiscount (validated against coupon parameters)
   * 5. taxableAmount = max(0, cartSubtotal - couponDiscount)
   * 6. gstAmount = 18% of taxableAmount (rounded to 2 decimal places)
   * 7. finalTotal = taxableAmount + gstAmount (rounded to 2 decimal places)
   * 8. item-level breakdown allocated so sum(itemFinalAmount) === finalTotal exactly
   */
  calculateCheckoutTotals(cart, coupon = null) {
    let subtotal = 0;
    let courseDiscount = 0;

    cart.forEach(course => {
      const price = course.basePrice || course.price || 0;
      const dPrice = course.discountPrice || 0;
      subtotal += price;
      if (dPrice > 0 && dPrice < price) {
        courseDiscount += (price - dPrice);
      }
    });

    subtotal = Number(subtotal.toFixed(2));
    courseDiscount = Number(courseDiscount.toFixed(2));
    const cartSubtotal = Number(Math.max(0, subtotal - courseDiscount).toFixed(2));

    let couponDiscount = 0;
    let couponError = null;

    if (coupon) {
      const now = new Date();
      const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < now;
      const isInactive = coupon.status !== "active";
      const isLimitReached = coupon.usageCount >= coupon.usageLimit;
      const isBelowMinOrder = cartSubtotal < (coupon.minOrderValue || 0);

      if (isInactive || isExpired || isLimitReached || isBelowMinOrder) {
        if (isBelowMinOrder) {
          couponError = `Minimum order value for this coupon is ₹${coupon.minOrderValue}.`;
        } else if (isExpired) {
          couponError = "This coupon has expired.";
        } else if (isLimitReached) {
          couponError = "Coupon usage limit has been reached.";
        } else {
          couponError = "This coupon is no longer available or valid for this order.";
        }
      } else {
        if (coupon.discountType === "flat") {
          couponDiscount = coupon.discountValue || 0;
        } else if (coupon.discountType === "percentage") {
          couponDiscount = (cartSubtotal * (coupon.discountValue || 0)) / 100;
          if (coupon.maxDiscount > 0 && couponDiscount > coupon.maxDiscount) {
            couponDiscount = coupon.maxDiscount;
          }
        }
        if (couponDiscount > cartSubtotal) {
          couponDiscount = cartSubtotal;
        }
      }
    }

    couponDiscount = Number(couponDiscount.toFixed(2));
    const taxableAmount = Number(Math.max(0, cartSubtotal - couponDiscount).toFixed(2));
    const gstAmount = Number((taxableAmount * 0.18).toFixed(2));
    const finalTotal = Number((taxableAmount + gstAmount).toFixed(2));

    // Allocate item-level amounts so sum(itemFinalAmount) === finalTotal
    let remainingCouponDiscount = couponDiscount;
    let accumulatedItemFinal = 0;
    const items = [];

    cart.forEach((course, index) => {
      const price = course.basePrice || course.price || 0;
      const dPrice = course.discountPrice || 0;
      let cDiscount = 0;
      if (dPrice > 0 && dPrice < price) {
        cDiscount = price - dPrice;
      }
      const courseSubtotal = price - cDiscount;

      let itemCouponDiscount = 0;
      if (cartSubtotal > 0) {
        if (index === cart.length - 1) {
          itemCouponDiscount = Number(remainingCouponDiscount.toFixed(2));
        } else {
          itemCouponDiscount = Number(((courseSubtotal / cartSubtotal) * couponDiscount).toFixed(2));
          remainingCouponDiscount -= itemCouponDiscount;
        }
      }

      const itemTaxable = Number(Math.max(0, courseSubtotal - itemCouponDiscount).toFixed(2));
      const itemGst = Number((itemTaxable * 0.18).toFixed(2));
      let itemFinalAmount = Number((itemTaxable + itemGst).toFixed(2));

      // For the last item, ensure sum of itemFinalAmounts equals finalTotal down to exact 2 decimals
      if (index === cart.length - 1) {
        itemFinalAmount = Number((finalTotal - accumulatedItemFinal).toFixed(2));
      } else {
        accumulatedItemFinal += itemFinalAmount;
      }

      items.push({
        course,
        subtotal: price,
        courseDiscount: cDiscount,
        couponDiscount: itemCouponDiscount,
        taxableAmount: itemTaxable,
        gstAmount: itemGst,
        finalAmount: itemFinalAmount
      });
    });

    return {
      subtotal,
      courseDiscount,
      cartSubtotal,
      couponDiscount,
      couponError,
      taxableAmount,
      gstAmount,
      finalTotal,
      items
    };
  }

  async getCheckoutData(userId) {
    const cartResult = await cartService.getCart(userId);

    if (!cartResult.success) {
      return {
        success: false,
        message: "Failed to load cart"
      };
    }

    const cart = cartResult.cart;

    // Filter out unpublished or unavailable courses
    const validCart = cart.filter(course => course.status === 'published' && !course.isDeleted);
    
    if (validCart.length === 0) {
      return {
        success: false,
        message: "No valid courses remaining in your cart. They may have been removed or become unavailable."
      };
    }

    const totals = this.calculateCheckoutTotals(validCart);

    // Fetch active coupons
    const couponResult = await couponService.getActiveCoupons();
    const coupons = couponResult.success ? couponResult.coupons : [];

    return {
      success: true,
      cart: validCart,
      subtotal: totals.subtotal,
      courseDiscount: totals.courseDiscount,
      cartSubtotal: totals.cartSubtotal,
      taxableAmount: totals.taxableAmount,
      gstAmount: totals.gstAmount,
      total: totals.finalTotal,
      coupons
    };
  }
}

module.exports = new CheckoutService();
