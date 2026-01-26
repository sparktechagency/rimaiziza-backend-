import mongoose, { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { FavouriteCar } from "./favouriteCar.model";
import { getCarTripCountMap } from "../car/car.utils";
import { ReviewServices } from "../review/review.service";
import { REVIEW_TYPE } from "../review/review.interface";

const checkFavouriteCarStatus = async (userId: string, referenceId: string) => {
  const favourite = await FavouriteCar.findOne({ userId, referenceId });
  return { isFavourite: !!favourite };
};

const toggleFavourite = async (payload: {
  userId: string;
  referenceId: string;
}) => {
  const { userId, referenceId } = payload;

  const existing = await FavouriteCar.findOne({ userId, referenceId });

  if (existing) {
    await FavouriteCar.deleteOne({ _id: existing._id });
    return { message: "Favourite removed successfully", isFavourite: false };
  }

  const newFavourite = await FavouriteCar.create({
    userId,
    referenceId: new mongoose.Types.ObjectId(referenceId),
  });

  return {
    message: "Favourite added successfully",
    isFavourite: true,
    data: newFavourite,
  };
};

// const getFavourite = async (userId: string) => {
//   const favourites = await FavouriteCar.find({ userId })
//     .populate({
//       path: "referenceId",
//     })
//     .populate({
//       path: "userId",
//       select: "_id firstName email lastName role profileImage",
//     })
//     .lean();

//   return favourites;
// };

const getFavourite = async (userId: string) => {
  const favourites = await FavouriteCar.find({ userId })
    .populate({
      path: "referenceId", // Car
    })
    .populate({
      path: "userId",
      select: "_id firstName email lastName role profileImage",
    })
    .lean();

  if (!favourites.length) return favourites;

  // ---------- STEP 1: Extract carIds ----------
  const carIds = favourites
    .map((fav: any) => fav.referenceId?._id)
    .filter(Boolean)
    .map((id: any) => new Types.ObjectId(id));

  // ---------- STEP 2: Get trip count map ----------
  const tripCountMap = await getCarTripCountMap(carIds);


  // ---------- STEP 3: Attach trips + rating ----------
  const finalFavourites = await Promise.all(
    favourites.map(async (fav: any) => {
      const carId = fav.referenceId?._id?.toString();

      const reviewSummary =
        await ReviewServices.getReviewSummaryFromDB(
          carId,
          REVIEW_TYPE.CAR
        );

      return {
        ...fav,
        referenceId: {
          ...fav.referenceId,
          trips: tripCountMap[carId] || 0,
          averageRating: reviewSummary.averageRating,
          totalReviews: reviewSummary.totalReviews,
          starCounts: reviewSummary.starCounts,
          reviews: reviewSummary.reviews,
        },
      };
    })
  );

  return finalFavourites;
};

const getSingleFavourite = async (userId: string, favouriteId: string) => {
  const favourite = await FavouriteCar.findOne({
    _id: favouriteId,
    userId,
  })
    .populate({
      path: "referenceId",
    })
    .lean();

  if (!favourite) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Favourite not found");
  }

  return favourite;
};

const deleteFavourite = async (userId: string, referenceId: string) => {
  const result = await FavouriteCar.deleteOne({ userId, referenceId });

  if (!result.deletedCount) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Favourite not found");
  }

  return { message: "Favourite removed successfully" };
};

export const FavouriteCarServices = {
  toggleFavourite,
  checkFavouriteCarStatus,
  getFavourite,
  getSingleFavourite,
  deleteFavourite,
};
