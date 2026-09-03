import mongoose from 'mongoose';


const transactionSchema=new mongoose.Schema({

type:{
type:String,
enum:["credit","debit"],
required:true
},

amount:{
  type:Number,
  required:true
},

description:{
  type:String,
  required:true
},

order:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Order"
},

createdAt:{
  type: Date,
  default: Date.now
}
});

const walletSchema=new mongoose.Schema(
{

  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    unique:true,
    required:true
  },

  balance:{
    type:Number,
    default:0
  },

  transactions:[transactionSchema]

},
{
  timestamps:true
});

export default mongoose.model("Wallet",walletSchema);

