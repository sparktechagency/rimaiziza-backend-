import { Types } from "mongoose";
import { HOST_STATUS, USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import { User } from "../user/user.model";
import {
  AVAILABLE_DAYS,
  CAR_VERIFICATION_STATUS,
  IBlockedDate,
  ICar,
} from "./car.interface";
import { Car } from "./car.model";
import QueryBuilder from "../../builder/queryBuilder";
import { FavouriteCar } from "../favouriteCar/favouriteCar.model";
import { ReviewServices } from "../review/review.service";
import { REVIEW_TYPE } from "../review/review.interface";
import { Booking } from "../booking/booking.model";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { checkCarAvailabilityByDate, getCarCalendar, getCarTripCount, getCarTripCountMap, getTargetLocation } from "./car.utils";
import redisClient from "../../../shared/redisClient";
import { Destination } from "../destination/destination.model";



const createCarToDB = async (userId: string, payload: ICar) => {
  const user = await User.findOne({
    _id: userId,
    hostStatus: HOST_STATUS.APPROVED,
    role: USER_ROLES.HOST,
  });

  if (!user) {
    throw new ApiError(400, "No user found by this Id");
  }

  payload.userId = new Types.ObjectId(userId);

  if (payload.facilities?.length) {
    payload.facilities.forEach(facility => {
      if (!facility.label || !facility.value) {
        throw new ApiError(400, "Each facility must have label and value");
      }
    });
  }

  // const result = await Car.create(payload);

  // if (!result) {
  //   throw new ApiError(400, "Failed to create a car");
  // }

  // return result;

  try {
    const result = await Car.create(payload);
    return result;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new ApiError(400, "Car with this license plate already exists");
    }
    throw new ApiError(error.statusCode || 500, error.message || "Failed to create a car");
  }
};

// for feed
// const getAllCarsFromDB = async (query: any, userId: string) => {
//   const baseQuery = Car.find({
//     verificationStatus: CAR_VERIFICATION_STATUS.APPROVED,
//   }).populate({
//     path: "userId",
//     select: "firstName lastName fullName role profileImage email phone",
//   });

//   const queryBuilder = new QueryBuilder(baseQuery, query)
//     .search(["brand", "model", "transmission", "color", "city", "licensePlate"])
//     .sort()
//     .fields()
//     .filter()
//     .paginate();

//   const cars = await queryBuilder.modelQuery;

//   const now = new Date();


//   const carsWithBookmark = await Promise.all(
//     cars.map(async (car: any) => {

//       const tripsCountMap = await getCarTripCountMap([car._id]);

//       const availabilityCalendar = await getCarCalendar(car._id.toString());

//       const isBookmarked = await FavouriteCar.exists({
//         userId,
//         referenceId: car._id,
//       });

//       const reviewSummary = await ReviewServices.getReviewSummaryFromDB(
//         car.id,
//         REVIEW_TYPE.CAR,
//       );

//       const isAvailable = await checkCarAvailabilityByDate(car, now);


//       return {
//         ...car.toObject(),
//         isAvailable,
//         availabilityCalendar,
//         trips: tripsCountMap[car._id.toString()] || 0,
//         isFavourite: Boolean(isBookmarked),
//         averageRating: reviewSummary.averageRating,
//         totalReviews: reviewSummary.totalReviews,
//         starCounts: reviewSummary.starCounts,
//         reviews: reviewSummary.reviews,
//       };
//     }),
//   );

//   const meta = await queryBuilder.countTotal();

//   if (!cars || cars.length === 0) {
//     throw new ApiError(404, "No cars are found in the database");
//   }

//   return {
//     data: carsWithBookmark,
//     meta,
//   };
// };

// const getAllCarsFromDB = async (query: any, userId: string) => {

//   // =========================redis========================
//   // const redisKey = `cars:${userId}:${JSON.stringify(query)}`

//   // const cached = await redisClient.get(redisKey)

//   // if (cached) {
//   //   return JSON.parse(cached)
//   // }

//   const {
//     searchTerm,
//     minPrice, maxPrice,
//     transmission,
//     fuelType,
//     color,
//     city,
//     rating,
//     latitude, longitude, maxDistance,
//     date,
//     time,
//     sort,
//     page = 1,
//     limit = 10
//   } = query;

//   // ---------- create dynamic object ----------
//   const filter: any = {
//     verificationStatus: CAR_VERIFICATION_STATUS.APPROVED,
//     isActive: true
//   };

//   // search logic
//   if (searchTerm) {
//     filter.$or = [
//       { brand: { $regex: searchTerm, $options: "i" } },
//       { model: { $regex: searchTerm, $options: "i" } },
//       { city: { $regex: searchTerm, $options: "i" } },
//     ];
//   }

//   // Price Range (Combine logic)
//   if (minPrice || maxPrice) {
//     filter.dailyPrice = {};
//     if (minPrice) filter.dailyPrice.$gte = Number(minPrice);
//     if (maxPrice) filter.dailyPrice.$lte = Number(maxPrice);
//   }

//   // dynamic enum and text filters
//   if (transmission) filter.transmission = transmission;
//   if (fuelType) filter.fuelType = fuelType;
//   if (color) filter.color = { $regex: color, $options: "i" };
//   if (city) filter.city = { $regex: city, $options: "i" };

//   // ---------- create pipeline ----------
//   let pipeline: any[] = [];

//   // if location exists, GeoNear must be first
//   if (latitude && longitude) {
//     pipeline.push({
//       $geoNear: {
//         near: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
//         distanceField: "distance",
//         maxDistance: maxDistance ? Number(maxDistance) * 1000 : 50000,
//         spherical: true,
//         query: filter
//       }
//     });
//   } else {
//     // if do not have geo filter, match stage comes first
//     pipeline.push({ $match: filter });
//   }

//   // sorting
//   let sortObj: any = { createdAt: -1 };
//   if (sort === "priceLowToHigh") sortObj = { dailyPrice: 1 };
//   if (sort === "priceHighToLow") sortObj = { dailyPrice: -1 };
//   if (sort === "distance" && latitude) sortObj = { distance: 1 };

//   pipeline.push({ $sort: sortObj });

//   // Pagination
//   const skip = (Number(page) - 1) * Number(limit);
//   pipeline.push({ $skip: skip }, { $limit: Number(limit) });

//   // fetch data
//   const cars = await Car.aggregate(pipeline);

//   // ---------- Availability & Reviews ----------
//   const targetDate = (date as string) || new Date().toISOString().split("T")[0];

//   const processedCars = await Promise.all(
//     cars.map(async (carData: any) => {
//       const car = await Car.findById(carData._id).populate({
//         path: "userId",
//         select: "firstName lastName fullName role profileImage email phone",
//       });

//       if (!car) return null;

//       // Availability check
//       const availability = await CarServices.getAvailability(car._id.toString(), targetDate);

//       const availabilityCalendar = await getCarCalendar(car._id.toString());

//       let isAvailable = !availability.isFullyBlocked;
//       if (time) {
//         const slot = availability.slots.find((s: any) => s.time === time);
//         isAvailable = slot ? slot.isAvailable : false;
//       }

//       // date or time filter
//       if ((date || time) && !isAvailable) return null;

//       // rating filter
//       const reviewSummary = await ReviewServices.getReviewSummaryFromDB(car._id.toString(), REVIEW_TYPE.CAR);
//       if (rating && reviewSummary.averageRating < Number(rating)) return null;

//       // other data
//       const tripsCountMap = await getCarTripCountMap([car._id]);
//       const isBookmarked = await FavouriteCar.exists({ userId, referenceId: car._id });

//       return {
//         ...car.toObject(),
//         distance: carData.distance ? (carData.distance / 1000).toFixed(1) : null,
//         isAvailable,
//         availabilityCalendar,
//         trips: tripsCountMap[car._id.toString()] || 0,
//         isFavourite: Boolean(isBookmarked),
//         averageRating: reviewSummary.averageRating,
//         totalReviews: reviewSummary.totalReviews,
//         starCounts: reviewSummary.starCounts,
//         reviews: reviewSummary.reviews,
//         availabilitySlots: availability.slots
//       };
//     })
//   );

//   // filter out nulls
//   const finalCars = processedCars.filter(car => car !== null);

//   const result =
//   {
//     data: finalCars,
//     meta: {
//       page: Number(page),
//       limit: Number(limit),
//       total: finalCars.length,
//     },
//   };

//   // await redisClient.set(redisKey, JSON.stringify(result), { EX: 300 })

//   return result;

// };

const getAllCarsFromDB = async (query: any, userId: string) => {
  const {
    searchTerm,
    minPrice, maxPrice,
    transmission,
    fuelType,
    color,
    city,
    rating,
    latitude, longitude, maxDistance,
    withDriver,
    date,
    time,
    sort,
    page = 1,
    limit = 10
  } = query;

  // reusable function get location
  const { lat, lng } = await getTargetLocation(latitude, longitude, userId);

  // ---------- create dynamic object ----------
  const filter: any = {
    verificationStatus: CAR_VERIFICATION_STATUS.APPROVED,
    isActive: true
  };

  // search logic
  if (searchTerm) {
    filter.$or = [
      { brand: { $regex: searchTerm, $options: "i" } },
      { model: { $regex: searchTerm, $options: "i" } },
      { city: { $regex: searchTerm, $options: "i" } },
    ];
  }

  if (withDriver !== undefined) {
    filter.withDriver = withDriver === "true" || withDriver === true;
  }

  // Price Range
  if (minPrice || maxPrice) {
    filter.dailyPrice = {};
    if (minPrice) filter.dailyPrice.$gte = Number(minPrice);
    if (maxPrice) filter.dailyPrice.$lte = Number(maxPrice);
  }

  // dynamic enum and text filters
  if (transmission) filter.transmission = transmission;
  if (fuelType) filter.fuelType = fuelType;
  if (color) filter.color = { $regex: color, $options: "i" };
  if (city) filter.city = { $regex: city, $options: "i" };

  // ---------- create pipeline ----------
  let pipeline: any[] = [];

  // 
  pipeline.push({
    $geoNear: {
      near: { type: "Point", coordinates: [lng, lat] },
      distanceField: "distance",
      maxDistance: maxDistance ? Number(maxDistance) * 1000 : 500000, // 500km
      spherical: true,
      query: filter
    }
  });

  // sorting
  let sortObj: any = { createdAt: -1 };
  if (sort === "priceLowToHigh") sortObj = { dailyPrice: 1 };
  if (sort === "priceHighToLow") sortObj = { dailyPrice: -1 };
  if (sort === "distance") sortObj = { distance: 1 };

  pipeline.push({ $sort: sortObj });

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  pipeline.push({ $skip: skip }, { $limit: Number(limit) });

  // fetch data
  const cars = await Car.aggregate(pipeline);

  // ---------- Availability & Reviews ----------
  const targetDate = (date as string) || new Date().toISOString().split("T")[0];

  const processedCars = await Promise.all(
    cars.map(async (carData: any) => {
      const car = await Car.findById(carData._id).populate({
        path: "userId",
        select: "firstName lastName fullName role profileImage email phone",
      });

      if (!car) return null;

      // Availability check
      const availability = await CarServices.getAvailability(car._id.toString(), targetDate);
      const availabilityCalendar = await getCarCalendar(car._id.toString());

      let isAvailable = !availability.isFullyBlocked;
      if (time) {
        const slot = availability.slots.find((s: any) => s.time === time);
        isAvailable = slot ? slot.isAvailable : false;
      }

      // date or time filter
      if ((date || time) && !isAvailable) return null;

      // rating filter
      const reviewSummary = await ReviewServices.getReviewSummaryFromDB(car._id.toString(), REVIEW_TYPE.CAR);
      if (rating && reviewSummary.averageRating < Number(rating)) return null;

      // other data
      const tripsCountMap = await getCarTripCountMap([car._id]);
      const isBookmarked = await FavouriteCar.exists({ userId, referenceId: car._id });

      return {
        ...car.toObject(),
        // distance in km
        distance: carData.distance !== undefined ? (carData.distance / 1000).toFixed(1) : "0.0",
        isAvailable,
        availabilityCalendar,
        trips: tripsCountMap[car._id.toString()] || 0,
        isFavourite: Boolean(isBookmarked),
        averageRating: reviewSummary.averageRating,
        totalReviews: reviewSummary.totalReviews,
        starCounts: reviewSummary.starCounts,
        reviews: reviewSummary.reviews,
        availabilitySlots: availability.slots
      };
    })
  );

  // filter out nulls
  const finalCars = processedCars.filter(car => car !== null);

  const result = {
    data: finalCars,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: finalCars.length,
    },
  };

  return result;
};

// const getRecentCarsFromDB = async (userId?: string) => {
//   const limit = 10;

//   const cars = await Car.find({
//     verificationStatus: CAR_VERIFICATION_STATUS.APPROVED,
//     isActive: true,
//   })
//     .sort({ createdAt: -1 }) // recent first
//     .limit(limit)
//     .populate({
//       path: "userId",
//       select: "firstName lastName fullName profileImage",
//     })
//     .lean();

//   // optional: user-specific favourite check
//   let favouriteMap: Record<string, boolean> = {};

//   if (userId) {
//     const favourites = await FavouriteCar.find({
//       userId,
//       referenceId: { $in: cars.map(c => c._id) },
//     }).select("referenceId");

//     favourites.forEach(fav => {
//       favouriteMap[fav.referenceId.toString()] = true;
//     });
//   }

//   const result = cars.map(car => ({
//     ...car,
//     isFavourite: Boolean(favouriteMap[car._id.toString()]),
//   }));

//   return {
//     data: result,
//     meta: {
//       total: result.length,
//     },
//   };
// };

const getRecentCarsFromDB = async (userId?: string) => {
  const limit = 10;

  //  get location
  const { lat, lng } = await getTargetLocation(undefined, undefined, userId);


  const cars = await Car.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        spherical: true,
        query: {
          verificationStatus: CAR_VERIFICATION_STATUS.APPROVED,
          isActive: true,
        },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
  ]);


  let favouriteMap: Record<string, boolean> = {};

  if (userId) {
    const favourites = await FavouriteCar.find({
      userId,
      referenceId: { $in: cars.map(c => c._id) },
    }).select("referenceId");

    favourites.forEach(fav => {
      favouriteMap[fav.referenceId.toString()] = true;
    });
  }


  const result = await Promise.all(
    cars.map(async (carData: any) => {

      const carWithUser = await Car.findById(carData._id)
        .populate({
          path: "userId",
          select: "firstName lastName fullName profileImage",
        })
        .lean();

      return {
        ...carWithUser,
        // convert distance to km
        distance: carData.distance !== undefined ? (carData.distance / 1000).toFixed(1) : "0.0",
        isFavourite: Boolean(favouriteMap[carData._id.toString()]),
      };
    })
  );

  return {
    data: result,
    meta: {
      total: result.length,
    },
  };
};

// for verifications, dashboard
const getAllCarsForVerificationsFromDB = async (query: any) => {
  const baseQuery = Car.find({
    verificationStatus: {
      $in: [
        CAR_VERIFICATION_STATUS.PENDING,
        CAR_VERIFICATION_STATUS.REJECTED,
        CAR_VERIFICATION_STATUS.APPROVED,
      ],
    },
  }).populate({
    path: "userId",
    select: "firstName lastName fullName role email phone profileImage",
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["brand", "model", "transmission", "color", "city", "licensePlate"])
    .sort()
    .fields()
    .filter()
    .paginate();

  const cars = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  if (!cars || cars.length === 0) {
    throw new ApiError(404, "No cars are found in the database");
  }

  return {
    data: cars,
    meta,
  };
};

const updateCarVerificationStatusByIdToDB = async (
  carId: string,
  carVerificationStatus:
    | CAR_VERIFICATION_STATUS.APPROVED
    | CAR_VERIFICATION_STATUS.PENDING
    | CAR_VERIFICATION_STATUS.REJECTED,
) => {
  if (
    ![
      CAR_VERIFICATION_STATUS.PENDING,
      CAR_VERIFICATION_STATUS.APPROVED,
      CAR_VERIFICATION_STATUS.REJECTED,
    ].includes(carVerificationStatus)
  ) {
    throw new ApiError(
      400,
      "Car verification status must be either 'PENDING','APPROVED' or 'REJECTED'",
    );
  }
  console.log(carVerificationStatus, "STATUS");

  const result = await Car.findByIdAndUpdate(
    carId,
    { verificationStatus: carVerificationStatus },
    { new: true },
  );

  if (!result) {
    throw new ApiError(
      400,
      "Failed to change car verification status by this car ID",
    );
  }

  return result;
};

// for host role
// const getOwnCarsFromDB = async (userId: string) => {
//   const user = await User.findOne({
//     _id: userId,
//     role: USER_ROLES.HOST,
//   });

//   if (!user) {
//     throw new ApiError(404, "No hosts are found by this ID");
//   }

//   const result = await Car.find({ userId }).populate({
//     path: "userId",
//     select: "firstName lastName fullName role profileImage email phone",
//   });

//   const carsWithBookmark = await Promise.all(
//     result.map(async (car: any) => {
//       const isBookmarked = await FavouriteCar.exists({
//         userId,
//         referenceId: car._id,
//       });

//       const reviewSummary = await ReviewServices.getReviewSummaryFromDB(
//         car.id,
//         REVIEW_TYPE.CAR,
//       );

//       return {
//         ...car.toObject(),
//         isFavourite: Boolean(isBookmarked),
//         averageRating: reviewSummary.averageRating,
//         totalReviews: reviewSummary.totalReviews,
//         starCounts: reviewSummary.starCounts,
//         reviews: reviewSummary.reviews,
//       };
//     }),
//   );

//   if (!result || result.length === 0) {
//     return [];
//   }

//   return carsWithBookmark;
// };

interface GetOwnCarsParams {
  userId: string;
  verificationStatus?: CAR_VERIFICATION_STATUS;
}

// const getOwnCarsFromDB = async ({
//   userId,
//   verificationStatus,
// }: GetOwnCarsParams) => {
//   const user = await User.findOne({
//     _id: userId,
//     role: USER_ROLES.HOST,
//   });

//   if (!user) {
//     throw new ApiError(404, "No hosts are found by this ID");
//   }

//   const carQuery: Record<string, any> = { userId };

//   //  enum-safe filter
//   if (verificationStatus) {
//     carQuery.verificationStatus = verificationStatus;
//   }

//   const cars = await Car.find(carQuery).populate({
//     path: "userId",
//     select: "firstName lastName fullName role profileImage email phone",
//   });

//   if (!cars.length) {
//     return [];
//   }

//   const carsWithMeta = await Promise.all(
//     cars.map(async (car) => {
//       const isBookmarked = await FavouriteCar.exists({
//         userId,
//         referenceId: car._id,
//       });

//       const reviewSummary =
//         await ReviewServices.getReviewSummaryFromDB(
//           car._id.toString(),
//           REVIEW_TYPE.CAR
//         );

//       return {
//         ...car.toObject(),
//         isFavourite: Boolean(isBookmarked),
//         averageRating: reviewSummary.averageRating,
//         totalReviews: reviewSummary.totalReviews,
//         starCounts: reviewSummary.starCounts,
//         reviews: reviewSummary.reviews,
//       };
//     })
//   );

//   return carsWithMeta;
// };

// const getCarByIdFromDB = async (id: string, userId: string) => {
//   const result = await Car.findById(id).populate({
//     path: "userId",
//     select: "firstName lastName fullName role profileImage email phone",
//   });

//   const isBookmarked = await FavouriteCar.exists({
//     userId,
//     referenceId: id,
//   });

//   const now = new Date();
//   const isAvailable = await checkCarAvailabilityByDate(result, now);

//   const availabilityCalendar = await getCarCalendar(id.toString());

//   const reviewSummary = await ReviewServices.getReviewSummaryFromDB(
//     id,
//     REVIEW_TYPE.CAR,
//   );

//   const trips = await getCarTripCount(id)

//   if (!result) {
//     return {};
//   }

//   return {
//     ...result.toObject(),
//     trips: trips || 0,
//     isAvailable,
//     availabilityCalendar,
//     isFavourite: Boolean(isBookmarked),
//     averageRating: reviewSummary.averageRating,
//     totalReviews: reviewSummary.totalReviews,
//     starCounts: reviewSummary.starCounts,
//     reviews: reviewSummary.reviews,
//   };
// };


const getOwnCarsFromDB = async ({
  userId,
  verificationStatus,
}: GetOwnCarsParams) => {
  const user = await User.findOne({
    _id: userId,
    role: USER_ROLES.HOST,
  });

  if (!user) {
    throw new ApiError(404, "No hosts are found by this ID");
  }

  //  get location
  const { lat, lng } = await getTargetLocation(undefined, undefined, userId);


  const carQuery: Record<string, any> = {
    userId: new Types.ObjectId(userId)
  };

  if (verificationStatus) {
    carQuery.verificationStatus = verificationStatus;
  }


  const cars = await Car.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        spherical: true,
        query: carQuery,
      },
    },
    { $sort: { createdAt: -1 } }
  ]);

  if (!cars.length) {
    return [];
  }


  const carsWithMeta = await Promise.all(
    cars.map(async (carData: any) => {

      const car = await Car.findById(carData._id).populate({
        path: "userId",
        select: "firstName lastName fullName role profileImage email phone",
      });

      if (!car) return null;

      const isBookmarked = await FavouriteCar.exists({
        userId,
        referenceId: car._id,
      });

      const reviewSummary = await ReviewServices.getReviewSummaryFromDB(
        car._id.toString(),
        REVIEW_TYPE.CAR
      );

      return {
        ...car.toObject(),
        // convert distance to km 
        distance: carData.distance !== undefined ? (carData.distance / 1000).toFixed(1) : "0.0",
        isFavourite: Boolean(isBookmarked),
        averageRating: reviewSummary.averageRating,
        totalReviews: reviewSummary.totalReviews,
        starCounts: reviewSummary.starCounts,
        reviews: reviewSummary.reviews,
      };
    })
  );

  // null filter
  return carsWithMeta.filter(car => car !== null);
};

const getCarByIdFromDB = async (id: string, userId: string) => {
  // get location
  const { lat, lng } = await getTargetLocation(undefined, undefined, userId);

  const cars = await Car.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        spherical: true,
        query: { _id: new Types.ObjectId(id) },
      },
    },
  ]);

  const carData = cars[0];

  if (!carData) {
    return {};
  }


  const car = await Car.findById(carData._id).populate({
    path: "userId",
    select: "firstName lastName fullName role profileImage email phone",
  });

  if (!car) return {};

  const isBookmarked = await FavouriteCar.exists({
    userId,
    referenceId: id,
  });

  const now = new Date();
  const isAvailable = await checkCarAvailabilityByDate(car, now);
  const availabilityCalendar = await getCarCalendar(id.toString());
  const reviewSummary = await ReviewServices.getReviewSummaryFromDB(id, REVIEW_TYPE.CAR);
  const trips = await getCarTripCount(id);

  return {
    ...car.toObject(),
    // convert distance to km
    distance: carData.distance !== undefined ? (carData.distance / 1000).toFixed(1) : "0.0",
    trips: trips || 0,
    isAvailable,
    availabilityCalendar,
    isFavourite: Boolean(isBookmarked),
    averageRating: reviewSummary.averageRating,
    totalReviews: reviewSummary.totalReviews,
    starCounts: reviewSummary.starCounts,
    reviews: reviewSummary.reviews,
  };
};


const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null),
  ) as Partial<T>;

enum ACTION {
  ADD = "ADD",
  DELETE = "DELETE",
}

export type ArrayActionValue =
  | string
  | {
    label: string;
    value: string;
  };

export interface IArrayAction {
  field: "images" | "availableDays" | "facilities";
  action: ACTION;
  value: ArrayActionValue;
}

type FacilityPayload = {
  label: string;
  value: string;
  icon?: string;
};


const updateCarByIdToDB = async (
  userId: string,
  carId: string,
  payload: Partial<ICar> & { arrayAction?: IArrayAction },
) => {
  // -------------------------- Check host --------------------------
  const user = await User.findOne({
    _id: userId,
    role: USER_ROLES.HOST,
    hostStatus: HOST_STATUS.APPROVED,
  });

  if (!user) {
    throw new ApiError(404, "No approved host found by this ID");
  }

  // -------------------------- Handle array actions --------------------------
  let updateQuery: any = {};

  if (payload.arrayAction) {
    const { field, action, value } = payload.arrayAction;

    const allowedFields = ["images", "availableDays", "facilities"];

    if (!allowedFields.includes(field)) {
      throw new ApiError(400, "Invalid array field");
    }

    // -------------------------- Build update query --------------------------
    if (field === "facilities") {
      const isFacilityPayload = (val: ArrayActionValue): val is FacilityPayload => {
        return (
          typeof val === "object" &&
          val !== null &&
          "label" in val &&
          "value" in val
        );
      };


      if (action === ACTION.ADD) {
        if (!isFacilityPayload(value)) {
          throw new ApiError(400, "Invalid facility payload");
        }

        updateQuery = {
          $addToSet: {
            facilities: {
              label: value.label,
              value: value.value.toLowerCase(),
              icon: value.icon,
            },
          },
        };
      }

      if (action === ACTION.DELETE) {
        if (typeof value !== "string") {
          throw new ApiError(400, "Facility value must be string");
        }

        updateQuery = {
          $pull: {
            facilities: { value },
          },
        };
      }
    }
    else {
      if (action === ACTION.ADD) {
        updateQuery = { $addToSet: { [field]: value } };
      }

      if (action === ACTION.DELETE) {
        updateQuery = { $pull: { [field]: value } };
      }
    }

    delete payload.arrayAction;

    const updated = await Car.findOneAndUpdate(
      { _id: carId, userId },
      updateQuery,
      { new: true },
    );

    if (!updated) {
      throw new ApiError(404, "Car not found or not owned by user");
    }

    return updated;
  }

  // -------------------------- Handle normal updates --------------------------
  const cleanPayload = removeUndefined(payload);
  delete (cleanPayload as any).userId;

  const updated = await Car.findOneAndUpdate(
    { _id: carId, userId },
    cleanPayload,
    { new: true },
  );

  if (!updated) {
    throw new ApiError(404, "Car not found or not owned by user");
  }

  return updated;
};


const deleteCarByIdFromDB = async (userId: string, id: string) => {
  // -------------------------- Check host --------------------------
  const user = await User.findOne({
    _id: userId,
    role: USER_ROLES.HOST,
    hostStatus: HOST_STATUS.APPROVED,
  });

  if (!user) {
    throw new ApiError(404, "No approved host found by this ID");
  }

  const result = await Car.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete car by this ID");
  }

  return result;
};

// const getAvailability = async (carId: string, dateString: string) => {
//   const targetDate = new Date(dateString);
//   const normalizedDate = new Date(
//     Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate())
//   );

//   const car = await Car.findById(carId).select(
//     "isActive availableDays availableHours defaultStartTime defaultEndTime blockedDates"
//   );

//   if (!car) throw new ApiError(404, "Car not found");
//   if (!car.isActive) return generateBlockedResponse(normalizedDate, "Car is not active");

//   // manual block with host reason
//   const blockedEntry = car.blockedDates?.find((b: any) =>
//     new Date(b.date).toISOString().split("T")[0] === normalizedDate.toISOString().split("T")[0]
//   );
//   if (blockedEntry) return generateBlockedResponse(normalizedDate, blockedEntry.reason || "Blocked by host");

//   // days check
//   const dayName = normalizedDate.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase() as AVAILABLE_DAYS;
//   if (!car.availableDays.includes(dayName)) {
//     return generateBlockedResponse(normalizedDate, "Car not available on this day");
//   }

//   // availableHours string[] → number[] convert
//   let openHoursSet = new Set<number>();

//   if (car.availableHours && car.availableHours.length > 0) {
//     car.availableHours.forEach((timeStr: string) => {
//       const hour = parseInt(timeStr.split(":")[0], 10);
//       if (!isNaN(hour) && hour >= 0 && hour <= 23) {
//         openHoursSet.add(hour);
//       }
//     });
//   }
//   // defaultStartTime/endTime
//   else if (car.defaultStartTime && car.defaultEndTime) {
//     const start = parseInt(car.defaultStartTime.split(":")[0], 10);
//     let end = parseInt(car.defaultEndTime.split(":")[0], 10);
//     const endHour = end === 0 ? 24 : end;

//     for (let h = start; h < endHour; h++) {
//       openHoursSet.add(h % 24);
//     }
//   }
//   // fallback 24 hour slots
//   else {
//     for (let i = 0; i < 24; i++) openHoursSet.add(i);
//   }

//   // final slots
//   const slots = Array.from({ length: 24 }, (_, hour) => {
//     const isAvailable = openHoursSet.has(hour);
//     return {
//       hour,
//       time: `${String(hour).padStart(2, "0")}:00`,
//       isAvailable,
//       blocked: !isAvailable,
//       blockedReason: isAvailable ? null : "Outside operating hours",
//     };
//   });

//   return {
//     date: normalizedDate.toISOString().split("T")[0],
//     isFullyBlocked: false,
//     blockedReason: null,
//     slots,
//   };
// };

// const generateBlockedResponse = (date: Date, reason: string) => ({
//   date: date.toISOString().split("T")[0],
//   isFullyBlocked: true,
//   blockedReason: reason,
//   slots: Array.from({ length: 24 }, (_, hour) => ({
//     hour,
//     time: `${String(hour).padStart(2, "0")}:00`,
//     isAvailable: false,
//     blocked: true,
//     blockedReason: reason,
//   })),
// });

const getAvailability = async (carId: string, dateString: string) => {
  // ---------- Normalize Date (UTC Day) ----------
  const targetDate = new Date(dateString);
  const normalizedDate = new Date(
    Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
    ),
  );

  // ---------- Fetch Car ----------
  const car = await Car.findById(carId).select(
    "isActive availableDays availableHours defaultStartTime defaultEndTime blockedDates",
  );

  if (!car) throw new ApiError(404, "Car not found");
  if (!car.isActive) {
    return generateBlockedResponse(normalizedDate, "Car is not active");
  }

  // ---------- Priority 1: Manual Full Day Block ----------
  const blockedEntry = car.blockedDates?.find(
    (b: any) =>
      new Date(b.date).toISOString().split("T")[0] ===
      normalizedDate.toISOString().split("T")[0],
  );

  if (blockedEntry) {
    return generateBlockedResponse(
      normalizedDate,
      blockedEntry.reason || "Blocked by host",
    );
  }

  // ---------- Day Availability Check ----------
  const dayName = normalizedDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase() as AVAILABLE_DAYS;

  if (car.availableDays?.length && !car.availableDays.includes(dayName)) {
    return generateBlockedResponse(
      normalizedDate,
      "Car not available on this day",
    );
  }

  // ---------- Priority 2: Define Operating Hours ----------
  const openHoursSet = new Set<number>();

  if (car.availableHours?.length) {
    car.availableHours.forEach((t: string) => {
      const h = parseInt(t.split(":")[0], 10);
      if (!isNaN(h) && h >= 0 && h <= 23) {
        openHoursSet.add(h);
      }
    });
  } else if (car.defaultStartTime && car.defaultEndTime) {
    const start = parseInt(car.defaultStartTime.split(":")[0], 10);
    const end = parseInt(car.defaultEndTime.split(":")[0], 10) || 24;

    for (let h = start; h < end; h++) {
      openHoursSet.add(h % 24);
    }
  } else {
    for (let i = 0; i < 24; i++) openHoursSet.add(i);
  }

  // ---------- Priority 3: Booking Conflict ----------
  const bookings = await Booking.find({
    carId: new Types.ObjectId(carId),
    status: { $in: [BOOKING_STATUS.PAID, BOOKING_STATUS.ONGOING] },
    fromDate: { $lt: new Date(normalizedDate.getTime() + 86400000) },
    toDate: { $gt: normalizedDate },
  }).select("fromDate toDate");

  const bookingBlockedHours = getBookingBlockedHours(bookings, normalizedDate);

  // ---------- Final Slot Generation ----------
  const slots = Array.from({ length: 24 }, (_, hour) => {
    // Outside operating hours
    if (!openHoursSet.has(hour)) {
      return {
        hour,
        time: `${String(hour).padStart(2, "0")}:00`,
        isAvailable: false,
        blocked: true,
        blockedReason: "Outside operating hours",
      };
    }

    // Already booked (only if operating hour)
    if (bookingBlockedHours.has(hour)) {
      return {
        hour,
        time: `${String(hour).padStart(2, "0")}:00`,
        isAvailable: false,
        blocked: true,
        blockedReason: "Already booked",
      };
    }

    // Available
    return {
      hour,
      time: `${String(hour).padStart(2, "0")}:00`,
      isAvailable: true,
      blocked: false,
      blockedReason: "",
    };
  });

  return {
    carId,
    date: normalizedDate.toISOString().split("T")[0],
    isFullyBlocked: false,
    blockedReason: "",
    slots,
  };
};

/**
 * =========================
 * HELPER: BOOKING HOURS
 * =========================
 */
const getBookingBlockedHours = (bookings: any[], date: Date) => {
  const blockedHours = new Set<number>();

  const dayStart = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
    ),
  );

  const dayEnd = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
    ),
  );

  bookings.forEach((booking) => {
    const start = new Date(
      Math.max(booking.fromDate.getTime(), dayStart.getTime()),
    );
    const end = new Date(Math.min(booking.toDate.getTime(), dayEnd.getTime()));

    let current = new Date(start);

    while (current < end) {
      blockedHours.add(current.getUTCHours());
      current.setUTCHours(current.getUTCHours() + 1);
    }
  });

  return blockedHours;
};

/**
 * =========================
 * HELPER: FULL DAY BLOCK
 * =========================
*/

const generateBlockedResponse = (date: Date, reason: string) => ({
  date: date.toISOString().split("T")[0],
  isFullyBlocked: true,
  blockedReason: reason,
  slots: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    time: `${String(hour).padStart(2, "0")}:00`,
    isAvailable: false,
    blocked: true,
    blockedReason: reason,
  })),
});

const createCarBlockedDatesToDB = async (
  carId: string,
  userId: string,
  payload: IBlockedDate[],
) => {
  // Ensure host exists
  const user = await User.findOne({
    _id: userId,
    role: USER_ROLES.HOST,
  }).select("_id");
  if (!user) throw new ApiError(400, "No user found by this Id");

  // Ensure car belongs to this host
  const car = await Car.findOne({ _id: carId, userId }).select("blockedDates");
  if (!car) throw new ApiError(404, "No car found by this ID");

  // Merge old + new
  const combined = [...(car.blockedDates || []), ...payload];

  // Normalize & remove duplicates by date
  const normalized = Array.from(
    new Map(
      combined.map((item) => [
        new Date(item.date).toISOString().split("T")[0], // unique key YYYY-MM-DD
        { date: new Date(item.date), reason: item.reason || "" },
      ]),
    ).values(),
  );

  // Update DB
  const result = await Car.findByIdAndUpdate(
    carId,
    { blockedDates: normalized },
    { new: true },
  );

  if (!result) throw new ApiError(400, "Failed to update blocked dates");

  return result;
};


// const getSuggestedCarsFromDB = async (userId: string, limit: number = 10) => {
//   console.log("===== START getSuggestedCarsFromDB =====");
//   const user = await User.findById(userId).select("location").lean();
//   console.log("User fetched:", user);

//   let userLocation: [number, number] | undefined;
//   if (
//     user?.location?.coordinates &&
//     Array.isArray(user.location.coordinates) &&
//     user.location.coordinates.length === 2
//   ) {
//     const [lng, lat] = user.location.coordinates;
//     if (lng !== 0 && lat !== 0) {
//       userLocation = [lng, lat];
//     }
//   }

//   // Default Dhaka location
//   const defaultLocation: [number, number] = [90.4074, 23.8103];
//   const location = userLocation || defaultLocation;
//   console.log("Using location:", location);

//   const maxDistance = 50000; // 50 km

//   // ---------- STEP 1: Geo query ----------
//   const rawCars = await Car.aggregate([
//     {
//       $geoNear: {
//         near: { type: "Point", coordinates: location },
//         distanceField: "distance", // original in meters
//         maxDistance,
//         spherical: true,
//         query: {
//           isActive: true,
//           verificationStatus: CAR_VERIFICATION_STATUS.APPROVED,
//         },
//       },
//     },
//     // convert distance to km with 1 decimal place
//     {
//       $addFields: {
//         distance: { $round: [{ $divide: ["$distance", 1000] }, 1] },
//       },
//     },
//     { $sort: { distance: 1 } },
//     { $limit: limit * 3 },
//   ]);

//   console.log("Raw cars fetched:", rawCars.length);

//   const targetDate = new Date(); // today (UTC)
//   const suggestedCars: any[] = [];

//   for (const car of rawCars) {
//     console.log("Checking car:", car._id);

//     // ================OLD CODE===================
//     //   const isBookable = await isCarBookableForDay(car, targetDate);
//     //   console.log(`Car ${car._id} bookable?`, isBookable);

//     //   if (isBookable) {
//     //     suggestedCars.push(car);
//     //   }
//     //   if (suggestedCars.length === limit) break;
//     // }

//     // ================NEW CODE===================
//     const isAvailable = await checkCarAvailabilityByDate(car, targetDate);

//     const availabilityCalendar = await getCarCalendar(car._id.toString());

//     if (isAvailable) {
//       suggestedCars.push({
//         ...car,
//         isAvailable: true,
//         availabilityCalendar,
//       });
//     }
//     if (suggestedCars.length === limit) break;
//   }

//   console.log("Suggested cars after availability check:", suggestedCars.length);

//   const populatedCars = await Car.populate(suggestedCars, {
//     path: "userId",
//     select: "firstName lastName email phone role profileImage",
//   });


//   // ---------- STEP 5: Add trip count ----------
//   const carIds = populatedCars.map((car: any) => car._id);

//   console.log("Car IDs for trip count:", carIds);

//   const tripCountMap = await getCarTripCountMap(carIds);

//   const finalCars = await Promise.all(
//     populatedCars.map(async (car: any) => {
//       const reviewSummary =
//         await ReviewServices.getReviewSummaryFromDB(
//           car._id,
//           REVIEW_TYPE.CAR
//         );

//       return {
//         ...car,
//         trips: tripCountMap[car._id.toString()] || 0,
//         averageRating: reviewSummary.averageRating,
//         totalReviews: reviewSummary.totalReviews,
//         starCounts: reviewSummary.starCounts,
//         reviews: reviewSummary.reviews,
//       };
//     })
//   );

//   console.log("===== END getSuggestedCarsFromDB =====");

//   return finalCars;
// };

const getSuggestedCarsFromDB = async (userId: string, limit: number = 10) => {
  console.log("===== START getSuggestedCarsFromDB =====");


  const { lat, lng } = await getTargetLocation(undefined, undefined, userId);
  const location: [number, number] = [lng, lat];

  console.log("Using location:", location);

  const maxDistance = 500000; // 500 km default for testing purpose

  // ---------- STEP 1: Geo query ----------
  const rawCars = await Car.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: location },
        distanceField: "distance", // original in meters
        maxDistance,
        spherical: true,
        query: {
          isActive: true,
          verificationStatus: CAR_VERIFICATION_STATUS.APPROVED,
        },
      },
    },

    {
      $addFields: {
        distance: { $round: [{ $divide: ["$distance", 1000] }, 1] },
      },
    },
    { $sort: { distance: 1 } },
    { $limit: limit * 3 },
  ]);

  console.log("Raw cars fetched:", rawCars.length);

  const targetDate = new Date(); // today (UTC)
  const suggestedCars: any[] = [];

  for (const car of rawCars) {
    console.log("Checking car:", car._id);

    const isAvailable = await checkCarAvailabilityByDate(car, targetDate);
    const availabilityCalendar = await getCarCalendar(car._id.toString());

    if (isAvailable) {
      suggestedCars.push({
        ...car,
        isAvailable: true,
        availabilityCalendar,
      });
    }
    if (suggestedCars.length === limit) break;
  }

  console.log("Suggested cars after availability check:", suggestedCars.length);

  const populatedCars = await Car.populate(suggestedCars, {
    path: "userId",
    select: "firstName lastName email phone role profileImage",
  });

  // ---------- STEP 5: Add trip count ----------
  const carIds = populatedCars.map((car: any) => car._id);
  console.log("Car IDs for trip count:", carIds);

  const tripCountMap = await getCarTripCountMap(carIds);

  const finalCars = await Promise.all(
    populatedCars.map(async (car: any) => {
      const reviewSummary = await ReviewServices.getReviewSummaryFromDB(
        car._id,
        REVIEW_TYPE.CAR
      );

      return {
        ...car,
        trips: tripCountMap[car._id.toString()] || 0,
        averageRating: reviewSummary.averageRating,
        totalReviews: reviewSummary.totalReviews,
        starCounts: reviewSummary.starCounts,
        reviews: reviewSummary.reviews,
      };
    })
  );

  console.log("===== END getSuggestedCarsFromDB =====");
  return finalCars;
};

// =====================================================
// HELPER: CHECK IF CAR IS BOOKABLE FOR A DAY
// =====================================================
const isCarBookableForDay = async (car: any, date: Date): Promise<boolean> => {
  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  // Manual full-day block
  const isManuallyBlocked = car.blockedDates?.some((b: any) => {
    return (
      new Date(b.date).toISOString().split("T")[0] ===
      dayStart.toISOString().split("T")[0]
    );
  });
  if (isManuallyBlocked) return false;

  // AvailableDays check
  if (car.availableDays?.length) {
    const dayName = dayStart
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase() as AVAILABLE_DAYS;
    if (!car.availableDays.includes(dayName)) return false;
  }


  // Booking overlap
  const bookingExists = await Booking.exists({
    carId: car._id,
    status: { $in: [BOOKING_STATUS.PAID, BOOKING_STATUS.ONGOING] },
    fromDate: { $lt: dayEnd },
    toDate: { $gt: dayStart },
  });

  return !bookingExists;
};



const getCarsByDestinationFromDB = async (destinationId: string) => {
  // destination find
  const destination = await Destination.findById(destinationId);

  if (!destination) {
    throw new ApiError(404, "Destination not found");
  }

  // cars by city (basic + fast)
  const result = await Car.find({
    city: destination.city,
    isActive: true,
    verificationStatus: CAR_VERIFICATION_STATUS.APPROVED,
  }).sort({ createdAt: -1 });

  return result
};



export const CarServices = {
  createCarToDB,
  getAllCarsFromDB,
  getOwnCarsFromDB,
  getCarByIdFromDB,
  updateCarByIdToDB,
  deleteCarByIdFromDB,
  getAvailability,
  createCarBlockedDatesToDB,
  getAllCarsForVerificationsFromDB,
  updateCarVerificationStatusByIdToDB,
  getSuggestedCarsFromDB,
  getRecentCarsFromDB,
  getCarsByDestinationFromDB
};
