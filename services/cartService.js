const User = require("../models/userModel");
const Course = require("../models/courseModel");

class CartService {
  async getCart(userId) {
    const user = await User.findById(userId).populate({
      path: "cart",
      match: { status: "published", isDeleted: false },
      populate: {
        path: "category",
        select: "name"
      }
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    return { success: true, cart: user.cart || [] };
  }

  async toggleCart(userId, courseId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const index = user.cart.findIndex(id => id.toString() === courseId.toString());
    let isAdded = false;

    if (index === -1) {
      user.cart.push(courseId);
      isAdded = true;
    } else {
      user.cart.splice(index, 1);
    }

    await user.save();
    return { success: true, isAdded };
  }

  async removeFromCart(userId, courseId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    user.cart = user.cart.filter(id => id.toString() !== courseId.toString());
    await user.save();

    return { success: true, message: "Removed from cart" };
  }

  async moveToWishlist(userId, courseId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Remove from cart
    user.cart = user.cart.filter(id => id.toString() !== courseId.toString());

    // Add to wishlist if not already there
    if (!user.wishlist.includes(courseId)) {
      user.wishlist.push(courseId);
    }

    await user.save();
    return { success: true, message: "Moved to wishlist" };
  }
}

module.exports = new CartService();
