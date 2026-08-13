const cartService = require("./cartService");

const couponService = require("./couponService");

class CheckoutService{

  async getCheckoutData(userId) {
    const cartResult = await cartService.getCart(userId);

    if (!cartResult.success) {
      return {
        success: false,
        message: "Failed to load cart"
      };
    }

    const cart = cartResult.cart;

    // Validate if any course is not published
    const unavailableCourses = cart.filter(course => course.status !== 'published');
    if (unavailableCourses.length > 0) {
      return {
        success: false,
        message: `Checkout blocked: "${unavailableCourses[0].title}" is no longer available for purchase.`
      };
    }

    let subtotal = 0;
    cart.forEach(course => {
      // Assuming course might have discountPrice or price/basePrice
      const priceToUse = course.discountPrice > 0 ? course.discountPrice : (course.basePrice || course.price || 0);
      subtotal += priceToUse;
    });

    const total = subtotal;

    // Fetch active coupons
    const couponResult = await couponService.getActiveCoupons();
    const coupons = couponResult.success ? couponResult.coupons : [];

    return {
      success: true,
      cart,
      subtotal,
      total,
      coupons
    }
  }
}


module.exports=new CheckoutService();
