const checkoutService=require("../../services/checkoutService.js");
const profileService = require("../../services/profileService"); 


exports.getCheckoutPage=async (req,res)=>{

// //get user id
// //get checkoutdata and user from service
// //if failure
// //render checkout page
try{
  const userId=req.session.user?.id;
  const checkoutResult=await checkoutService.getCheckoutData(userId);
   
  if(!checkoutResult.success){
    req.flash("error","Failed to load checkout.");
    return res.redirect("/")
  }

  res.render("pages/user/checkout/checkout",{
    title:"Checkout",
    isLoggedIn:true,
    cart:checkoutResult.cart,
    subtotal:checkoutResult.subtotal,
    total:checkoutResult.total
    })
}catch (err) {
    console.error(err);
    req.flash("error", "An error occurred.");
    return res.redirect("/");
}

}

