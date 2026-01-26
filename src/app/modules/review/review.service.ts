import { Types } from "mongoose";
import { Review } from "./review.model";
import { REVIEW_TYPE, TReview } from "./review.interface";
import ApiError from "../../../errors/ApiErrors";
import { Car } from "../car/car.model";

const createReviewToDB = async (payload: TReview, reviewerId: string) => {
  const { carId } = payload;

  if (!carId) {
    throw new ApiError(400, "carId is required");
  }

  const car = await Car.findById(carId); // hostId = User _id
  if (!car) throw new ApiError(404, "Car not found");

  const hostUserId = car.userId.toString();

  if (hostUserId === reviewerId) {
    throw new ApiError(400, "You cannot review your own car");
  }

  if (
    !Number.isInteger(payload.ratingValue) ||
    payload.ratingValue < 1 ||
    payload.ratingValue > 5
  ) {
    throw new ApiError(400, "Rating must be an integer between 1 and 5");
  }

  const reviewData: TReview = {
    carId: new Types.ObjectId(carId),
    hostId: car.userId, // User _id
    fromUserId: new Types.ObjectId(reviewerId),
    ratingValue: payload.ratingValue,
    feedback: payload.feedback?.trim(),
  };

  // check if already reviewed
  const already = await Review.findOne({
    carId: reviewData.carId,
    fromUserId: reviewData.fromUserId,
  });
  if (already) throw new ApiError(400, "You have already reviewed this car");

  const review = await Review.create(reviewData);

  return review;
};

const getReviewSummaryFromDB = async (
  targetId: string,
  type: REVIEW_TYPE.CAR | REVIEW_TYPE.HOST,
) => {
  const objectId = new Types.ObjectId(targetId);

  if (!targetId || !type) {
    throw new ApiError(400, "targetId and type (CAR/HOST) are required");
  }
  if (type !== REVIEW_TYPE.CAR && type !== REVIEW_TYPE.HOST) {
    throw new ApiError(400, "Invalid type. Use 'CAR' or 'HOST'");
  }

  const isCar = type === REVIEW_TYPE.CAR;
  const matchQuery = isCar ? { carId: objectId } : { hostId: objectId };

  const summary = await Review.aggregate([
    { $match: matchQuery },
    { $match: { ratingValue: { $in: [1, 2, 3, 4, 5] } } },
    { $group: { _id: "$ratingValue", count: { $sum: 1 } } },
  ]);

  const totalReviews = summary.reduce((a, c) => a + c.count, 0);
  const totalScore = summary.reduce((a, c) => a + c._id * c.count, 0);
  const average = totalReviews ? totalScore / totalReviews : 0;
  
  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  summary.forEach((item) => {
    const rating = item._id as number;
    if (rating >= 1 && rating <= 5) {
      starCounts[rating] = item.count;
    }
  });

  // reviews list
  const reviews = await Review.find(matchQuery)
    .populate({
      path: "fromUserId",
      select: "firstName lastName role email phone profileImage location createdAt updatedAt _id",
    })
    .sort({ createdAt: -1 })
    .lean();

  const reviewList = reviews.map((review: any) => ({
    reviewId: review._id,
    ratingValue: review.ratingValue,
    feedback: review.feedback,
    createdAt: review.createdAt,
    fromUser: {
      _id: review.fromUserId._id,
      firstName: review.fromUserId.firstName,
      lastName: review.fromUserId.lastName,
      role: review.fromUserId.role,
      email: review.fromUserId?.email,
      phone: review.fromUserId?.phone,
      profileImage: review.fromUserId?.profileImage,
      location: review.fromUserId?.location,
    },
  }));

  return {
    averageRating: Number(average.toFixed(1)),
    totalReviews,
    starCounts,
    reviews: reviewList,
  };
};

export const ReviewServices = {
  createReviewToDB,
  getReviewSummaryFromDB,
};
