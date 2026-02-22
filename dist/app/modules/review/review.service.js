"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewServices = void 0;
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const review_interface_1 = require("./review.interface");
const review_model_1 = require("./review.model");
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
// Create review (dual: host <-> user)
const createReview = (payload, reviewerId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { reviewForId, ratingValue, feedback, reviewType } = payload;
    if (!reviewForId)
      throw new ApiErrors_1.default(400, "reviewForId is required");
    if (!reviewType)
      throw new ApiErrors_1.default(400, "reviewType is required");
    if (
      ![
        review_interface_1.REVIEW_TARGET_TYPE.HOST,
        review_interface_1.REVIEW_TARGET_TYPE.USER,
      ].includes(reviewType)
    )
      throw new ApiErrors_1.default(400, "Invalid reviewType");
    if (reviewForId.toString() === reviewerId)
      throw new ApiErrors_1.default(400, "You cannot review yourself");
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5)
      throw new ApiErrors_1.default(
        400,
        "Rating must be an integer between 1 and 5",
      );
    // Check if already reviewed
    const already = yield review_model_1.Review.findOne({
      reviewForId,
      reviewById: reviewerId,
    });
    if (already)
      throw new ApiErrors_1.default(
        400,
        "You have already reviewed this user/host",
      );
    const review = yield review_model_1.Review.create({
      reviewForId: new mongoose_1.Types.ObjectId(reviewForId),
      reviewById: new mongoose_1.Types.ObjectId(reviewerId),
      ratingValue,
      feedback:
        feedback === null || feedback === void 0 ? void 0 : feedback.trim(),
      reviewType,
    });
    try {
      const type =
        reviewType === review_interface_1.REVIEW_TARGET_TYPE.HOST
          ? notification_constant_1.NOTIFICATION_TYPE.HOST
          : notification_constant_1.NOTIFICATION_TYPE.USER;
      yield (0, notificationsHelper_1.sendNotifications)({
        text: `You received a new rating (${ratingValue} star)`,
        receiver: review.reviewForId.toString(),
        type,
        referenceId: review._id.toString(),
      });
    } catch (error) {}
    return review;
  });
// Get review summary for a given target (host or user)
const getReviewSummary = (reviewForId, reviewType) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const objectId = new mongoose_1.Types.ObjectId(reviewForId);
    const summary = yield review_model_1.Review.aggregate([
      { $match: { reviewForId: objectId, reviewType } },
      { $group: { _id: "$ratingValue", count: { $sum: 1 } } },
    ]);
    const totalReviews = summary.reduce((a, c) => a + c.count, 0);
    const totalScore = summary.reduce((a, c) => a + c._id * c.count, 0);
    const averageRating = totalReviews ? totalScore / totalReviews : 0;
    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    summary.forEach((item) => {
      starCounts[item._id] = item.count;
    });
    const reviews = yield review_model_1.Review.find({
      reviewForId: objectId,
      reviewType,
    })
      .populate({
        path: "reviewById",
      })
      .sort({ createdAt: -1 })
      .lean();
    console.log(reviews, "reviews");
    const reviewList = reviews.map((r) => ({
      reviewId: r._id,
      ratingValue: r.ratingValue,
      feedback: r.feedback,
      createdAt: r.createdAt,
      fromUser: r.reviewById
        ? {
            _id: r.reviewById._id,
            name: r.reviewById.name,
            role: r.reviewById.role,
            email: r.reviewById.email,
            phone: r.reviewById.phone,
            profileImage: r.reviewById.profileImage,
            location: r.reviewById.location,
          }
        : null,
    }));
    return {
      averageRating: Number(averageRating.toFixed(1)),
      totalReviews,
      starCounts,
      reviews: reviewList,
    };
  });
const getBulkReviewSummary = (targetIds, reviewType) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const objectIds = targetIds.map((id) => new mongoose_1.Types.ObjectId(id));
    const summary = yield review_model_1.Review.aggregate([
      {
        $match: {
          reviewForId: { $in: objectIds },
          reviewType,
        },
      },
      {
        $group: {
          _id: {
            reviewForId: "$reviewForId",
            ratingValue: "$ratingValue",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.reviewForId",
          ratings: {
            $push: {
              rating: "$_id.ratingValue",
              count: "$count",
            },
          },
          totalReviews: { $sum: "$count" },
          totalScore: {
            $sum: {
              $multiply: ["$_id.ratingValue", "$count"],
            },
          },
        },
      },
    ]);
    const map = new Map();
    summary.forEach((item) => {
      const starCounts = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
      item.ratings.forEach((r) => {
        starCounts[r.rating] = r.count;
      });
      map.set(item._id.toString(), {
        averageRating: Number((item.totalScore / item.totalReviews).toFixed(1)),
        totalReviews: item.totalReviews,
        starCounts,
      });
    });
    return map;
  });
exports.ReviewServices = {
  createReview,
  getReviewSummary,
  getBulkReviewSummary,
};
