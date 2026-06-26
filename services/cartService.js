const User = require("../models/userModel");
const Course = require("../models/courseModel");

class CartService {
  async getCart(userId, searchQuery = "") {
    const matchQuery = { status: "published", isDeleted: false };
    if (searchQuery && searchQuery.trim() !== "") {
      matchQuery.title = { $regex: searchQuery.trim(), $options: "i" };
    }

    const user = await User.findById(userId).populate({
      path: "cart",
      match: matchQuery,
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
    let message = "";

    if (index === -1) {
      user.cart.push(courseId);
      // Prevent course from existing in both lists
      user.wishlist = user.wishlist.filter(id => id.toString() !== courseId.toString());
      isAdded = true;
      message = "Course added to cart.";
    } else {
      user.cart.splice(index, 1);
      message = "Course removed from cart.";
    }

    await user.save();
    return { success: true, isAdded, message };
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
    const inWishlist = user.wishlist.some(id => id.toString() === courseId.toString());
    if (!inWishlist) {
      user.wishlist.push(courseId);
    }

    await user.save();
    return { success: true, message: "Course moved to wishlist." };
  }
}

module.exports = new CartService();
