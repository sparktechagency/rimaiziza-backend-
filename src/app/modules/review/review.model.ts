import { model, Schema } from "mongoose";
import { TReview } from "./review.interface";

const reviewSchema = new Schema<TReview>(
  {
    carId: {
      type: Schema.Types.ObjectId,
      ref: "Car",
      required: [true, "Car ID is required"],
      index: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Host ID is required"],
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewer user ID is required"],
      index: true,
    },
    ratingValue: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating cannot be less than 1"],
      max: [5, "Rating cannot be more than 5"],
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [500, "Feedback cannot be more than 500 characters"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

reviewSchema.index({ carId: 1, fromUserId: 1 }, { unique: true });

reviewSchema.index({ hostId: 1, createdAt: -1 });

export const Review = model<TReview>("Review", reviewSchema);
