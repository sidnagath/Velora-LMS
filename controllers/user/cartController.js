const cartService = require("../../services/cartService");
const profileService = require("../../services/profileService"); 

exports.getCartPage = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const [cartResult, user] = await Promise.all([
      cartService.getCart(userId),
      profileService.getUserById(userId)
    ]);

    if (!cartResult.success) {
      req.flash("error", "Failed to load cart.");
      return res.redirect("/");
    }

    res.render("pages/user/cart/cart", {
      title: "My Cart",
      isLoggedIn: true,
      user,
      cart: cartResult.cart
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    return res.redirect("/");
  }
};

exports.removeCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.session.user?.id;

    const result = await cartService.removeFromCart(userId, courseId);
    if (result.success) {
      req.flash("success", "Course removed from cart.");
    } else {
      req.flash("error", "Failed to remove course.");
    }

    res.redirect("/user-cart");
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    res.redirect("/user-cart");
  }
};

exports.moveToWishlist = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.session.user?.id;

    const result = await cartService.moveToWishlist(userId, courseId);
    if (result.success) {
      req.flash("success", "Course moved to wishlist.");
    } else {
      req.flash("error", "Failed to move course to wishlist.");
    }

    res.redirect("/user-cart");
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    res.redirect("/user-cart");
  }
};

exports.toggleCart = async (req, res) => {
  try {
    const courseId = req.body.courseId;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in first" });
    }

    const result = await cartService.toggleCart(userId, courseId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
