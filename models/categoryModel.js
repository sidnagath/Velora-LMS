import mongoose from 'mongoose';


const categorySchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    unique: true
  },

  description: {
    type: String,
    default: ""
  },

  thumbnail: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }

}, {
  timestamps: true
});

export default mongoose.model(
  "Category",
  categorySchema
);