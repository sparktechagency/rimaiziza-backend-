"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
const mongoose_1 = require("mongoose");
const review_interface_1 = require("./review.interface");
const reviewSchema = new mongoose_1.Schema(
  {
    reviewForId: {
      type: mongoose_1.Schema.Types.ObjectId,
      required: true,
      refPath: "reviewType",
    },
    reviewById: {
      type: mongoose_1.Schema.Types.ObjectId,
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
      enum: Object.values(review_interface_1.REVIEW_TARGET_TYPE),
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
exports.Review = (0, mongoose_1.model)("Review", reviewSchema);
