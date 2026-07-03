const checkoutService=require("../../services/checkoutService.js");
const profileService = require("../../services/profileService"); 
const cartService = require("../../services/cartService"); // Import cartService

exports.getCheckoutPage=async (req,res)=>{
  
try{
  const userId=req.session.user?.id;
  
  // Fetch checkout data and cart count concurrently
  const [checkoutResult, cartCount] = await Promise.all([
    checkoutService.getCheckoutData(userId),
    cartService.getCartCount(userId)
  ]);
   
  if(!checkoutResult.success){
    req.flash("error","Failed to load checkout.");
    return res.redirect("/")
  }

  res.render("pages/user/checkout/checkout",{
    title:"Checkout",
    isLoggedIn:true,
    cart:checkoutResult.cart,
    subtotal:checkoutResult.subtotal,
    total:checkoutResult.total,
    cartCount: cartCount.success ? cartCount.count : 0 // Pass cart count for header badge
    })
}catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    return res.redirect("/");
}

}

