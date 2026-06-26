const cartService = require("./cartService");
const CartService=require("./cartService");

class CheckoutService{

async getCheckoutData(userId){

  const cartResult=await cartService.getCart(userId);

  if(!cartResult.success){
    return{
      success:false,
      message:"Failed to load cart"
    };
  }

const cart= cartResult.cart;

let subtotal=0;

cart.forEach(course=>{
  subtotal+=course.price || 0;
});

const total=subtotal;

return{
  success:true,
  cart,
  subtotal,
  total
}
}
}


module.exports=new CheckoutService();
