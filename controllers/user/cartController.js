import HTTP_STATUS_CODES from '../../constants/statusCodes.js';
import cartService from '../../services/cartService.js';
import profileService from '../../services/profileService.js';


export const getCartPage = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const searchQuery = req.query.search || "";
    const [cartResult, user,cartCount] = await Promise.all([
      cartService.getCart(userId, searchQuery),
      profileService.getUserById(userId),
      cartService.getCartCount(userId)
    ]);

    if (!cartResult.success) {
      req.flash("error", "Failed to load cart.");
      return res.redirect("/");
    }

    res.render("pages/user/cart/cart", {
      title: "My Cart",
      isLoggedIn: true,
      user,
      cart: cartResult.cart,
      search: searchQuery,
      cartCount: cartCount.success ? cartCount.count : 0
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    return res.redirect("/");
  }
};

export const removeCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.session.user?.id;

    const result = await cartService.removeFromCart(userId, courseId);
    if (result.success) {
      return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: "Course removed from cart." });
    } else {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Failed to remove course." });
    }
  } catch (err) {
    console.error(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred." });
  }
};

export const moveToWishlist = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.session.user?.id;

    const result = await cartService.moveToWishlist(userId, courseId);
    if (result.success) {
      return res.status(HTTP_STATUS_CODES.OK).json({ success: true, message: result.message });
    } else {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ success: false, message: result.message || "Failed to move course to wishlist." });
    }
  } catch (err) {
    console.error(err);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred." });
  }
};

export const toggleCart = async (req, res) => {
  try {
    const courseId = req.body.courseId;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({ success: false, message: "Please log in first" });
    }

    const result = await cartService.toggleCart(userId, courseId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};


export default {
  getCartPage,
  removeCourse,
  moveToWishlist,
  toggleCart
};
