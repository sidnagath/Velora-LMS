const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    
    title:{
      type:String,
      trim:true
    },
  
    description:{
      type:String,
      trim:true
    },


    category:{
      type:String,
      trim:true
    },

    instructor:{
      type:String,
      trim:true
    },

    level:{
      type:String,
      enum:[
        "Beginner",
        "Intermediate",
        "Advanced"
      ]
    },

    thumbnail:{
      type:String,
    },

    trailer:{
      type:String
    },

    status:{
     type:String,
     enum:[
      "draft",
      "published"
     ],
     default:"draft"
    },
    
    pricingType:{
      type:String,
      enum:["free", "paid"],
      default:"paid"
    },

    currency:{
      type:String,
      default:"INR"
    },

    basePrice:{
      type:Number,
      default:0
    },

    discountPrice:{
      type:Number,
      default:0
    },

    lifetimeAccess:{
      type:Boolean,
      default:true
    },

    downloadableResources:{
      type:Boolean,
      default:true
    },

    completionCertificate:{
      type:Boolean,
      default:true
    },
    
    isDeleted:{
      type:Boolean,
      default:false
    },

    rating: {
      type: Number,
      default: 0
    },

    reviewsCount: {
     type: Number,
     default: 0
   }
  },

    {
    timestamps:true
    }

);

module.exports = mongoose.model("Course", courseSchema);