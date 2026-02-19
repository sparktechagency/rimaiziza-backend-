import { Schema, model, Types } from "mongoose";
import { IReview, REVIEW_TARGET_TYPE } from "./review.interface";

const reviewSchema = new Schema<IReview>(
  {
    reviewForId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "reviewType",
    },
    reviewById: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    ratingValue: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },
    reviewType: {
      type: String,
      enum: Object.values(REVIEW_TARGET_TYPE),
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Prevent duplicate review: same reviewer cannot review same target more than once
reviewSchema.index({ reviewForId: 1, reviewById: 1 }, { unique: true });

export const Review = model<IReview>("Review", reviewSchema);
