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
