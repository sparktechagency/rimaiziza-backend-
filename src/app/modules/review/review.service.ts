import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { IReview, REVIEW_TARGET_TYPE } from "./review.interface";
import { Review } from "./review.model";

// Create review (dual: host <-> user)
const createReview = async (payload: IReview, reviewerId: string) => {
  const { reviewForId, ratingValue, feedback, reviewType } = payload;

  if (!reviewForId) throw new ApiError(400, "reviewForId is required");

  if (!reviewType) throw new ApiError(400, "reviewType is required");

  if (![REVIEW_TARGET_TYPE.HOST, REVIEW_TARGET_TYPE.USER].includes(reviewType))
    throw new ApiError(400, "Invalid reviewType");

  if (reviewForId.toString() === reviewerId)
    throw new ApiError(400, "You cannot review yourself");

  if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5)
    throw new ApiError(400, "Rating must be an integer between 1 and 5");

  // Check if already reviewed
  const already = await Review.findOne({
    reviewForId,
    reviewById: reviewerId,
  });

  if (already) throw new ApiError(400, "You have already reviewed this user/host");

  const review = await Review.create({
    reviewForId: new Types.ObjectId(reviewForId),
    reviewById: new Types.ObjectId(reviewerId),
    ratingValue,
    feedback: feedback?.trim(),
    reviewType,
  });

  return review;
};

// Get review summary for a given target (host or user)
const getReviewSummary = async (reviewForId: string, reviewType: REVIEW_TARGET_TYPE) => {
  const objectId = new Types.ObjectId(reviewForId);

  const summary = await Review.aggregate([
    { $match: { reviewForId: objectId, reviewType } },
    { $group: { _id: "$ratingValue", count: { $sum: 1 } } },
  ]);

  const totalReviews = summary.reduce((a, c) => a + c.count, 0);
  const totalScore = summary.reduce((a, c) => a + c._id * c.count, 0);
  const averageRating = totalReviews ? totalScore / totalReviews : 0;

  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  summary.forEach((item) => {
    starCounts[item._id as number] = item.count;
  });

  const reviews = await Review.find({ reviewForId: objectId, reviewType })
    .populate({
      path: "reviewById",
    })
    .sort({ createdAt: -1 })
    .lean();

    console.log(reviews,"reviews")

  const reviewList = reviews.map((r: any) => ({
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
};

type RatingValue = 1 | 2 | 3 | 4 | 5;

interface IStarCountItem {
  rating: RatingValue;
  count: number;
}

const getBulkReviewSummary = async (
  targetIds: string[],
  reviewType: REVIEW_TARGET_TYPE
) => {
  const objectIds = targetIds.map((id) => new Types.ObjectId(id));

  const summary = await Review.aggregate([
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

  const map = new Map<
    string,
    {
      averageRating: number;
      totalReviews: number;
      starCounts: Record<number, number>;
    }
  >();

  summary.forEach((item) => {
    const starCounts: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    item.ratings.forEach((r: { rating: 1 | 2 | 3 | 4 | 5; count: number }) => {
      starCounts[r.rating] = r.count;
    });

    map.set(item._id.toString(), {
      averageRating: Number(
        (item.totalScore / item.totalReviews).toFixed(1)
      ),
      totalReviews: item.totalReviews,
      starCounts,
    });
  });

  return map;
};

export const ReviewServices = {
  createReview,
  getReviewSummary,
  getBulkReviewSummary,
};
