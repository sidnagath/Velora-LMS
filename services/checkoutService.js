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

    // Filter out unpublished or unavailable courses
    const validCart = cart.filter(course => course.status === 'published' && !course.isDeleted);
    
    if (validCart.length === 0) {
      return {
        success: false,
        message: "No valid courses remaining in your cart. They may have been removed or become unavailable."
      };
    }

    let subtotal = 0;
    validCart.forEach(course => {
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
      cart: validCart,
      subtotal,
      total,
      coupons
    }
  }
}


module.exports=new CheckoutService();
