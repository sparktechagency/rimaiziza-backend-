import { Types } from "mongoose";
import { STATUS, USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import { User } from "../user/user.model";
import { AVAILABLE_DAYS, ICar } from "./car.interface";
import { Car } from "./car.model";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { generateVehicleId } from "../../../helpers/generateYearBasedId";
import {
  checkCarAvailabilityByDate,
  checkIfUserHasPaid,
  getCarCalendar,
  getCarTripCount,
  getCarTripCountMap,
  getTargetLocation,
  validateAvailabilityStrict,
} from "./car.utils";
import { FavoriteCar } from "../favoriteCar/favoriteCar.model";
import { Booking } from "../booking/booking.model";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { ReviewServices } from "../review/review.service";
import { IReviewSummary, REVIEW_TARGET_TYPE } from "../review/review.interface";
import QueryBuilder from "../../builder/queryBuilder";
import { Transaction } from "../transaction/transaction.model";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from "../transaction/transaction.interface";

const createCarToDB = async (payload: ICar) => {
  const carId = await generateVehicleId();

  payload.vehicleId = carId;

  if (payload.facilities?.length) {
    payload.facilities.forEach((facility) => {
      if (!facility.label || !facility.value) {
        throw new ApiError(400, "Each facility must have label and value");
      }
    });
  }

  const result = await Car.create(payload);

  const admin = await User.findOne({
    role: USER_ROLES.SUPER_ADMIN,
  }).select("_id name");

  if (admin) {
    await sendNotifications({
      text: `Car created successfully by admin (${admin.name || admin._id})`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: result._id.toString(),
    });
  }

  return result;
};

const getAllCarsFromDB = async (query: any) => {
  const baseQuery = Car.find().populate(
    "assignedHosts",
    "name email role profileImage membershipId",
  );

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["vehicleId", "brand", "model", "licensePlate"])
    .sort()
    .paginate();
  
  const cars = await queryBuilder.modelQuery;

  if (!cars.length) {
    throw new ApiError(404, "No cars found");
  }

  const meta = await queryBuilder.countTotal();

  return {
    meta,
    cars,
  };
};

const getCarByIdFromDB = async (id: string) => {
  const result = await Car.findById(id);
  if (!result) {
    throw new ApiError(404, "Car not found");
  }
  return result;
};

export enum ACTION {
  ADD = "ADD",
  DELETE = "DELETE",
}

export type ArrayActionValue =
  | string
  | Types.ObjectId
  | {
      label: string;
      value: string;
      icon?: string;
    };

export interface IArrayAction {
  field: "images" | "availableDays" | "facilities" | "assignedHosts";
  action: ACTION;
  value: ArrayActionValue;
}

// -------------------------- Utility --------------------------
const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null),
  ) as Partial<T>;

// -------------------------- Main Update Function --------------------------
const updateCarByIdToDB = async (
  carId: string,
  payload: Partial<ICar> & { arrayAction?: IArrayAction },
) => {
  // -------------------------- Check user --------------------------
  const user = await User.findOne({
    role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
    verified: true,
    status: STATUS.ACTIVE,
  });



  if (!user) {
    throw new ApiError(404, "No approved host found by this ID");
  }

  // -------------------------- Handle array actions --------------------------
  if (payload.arrayAction) {
    const { field, action, value } = payload.arrayAction;

    const allowedFields = ["images", "availableDays", "facilities"];

    if (!allowedFields.includes(field)) {
      throw new ApiError(400, "Invalid array field");
    }

    let updateQuery: any = {};

    // -------------------------- Facilities --------------------------
    if (field === "facilities") {
      const isFacilityPayload = (
        val: ArrayActionValue,
      ): val is { label: string; value: string; icon?: string } =>
        typeof val === "object" &&
        val !== null &&
        "label" in val &&
        "value" in val;

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
        updateQuery = { $pull: { facilities: { value } } };
      }
    }
    // -------------------------- Images & Available Days --------------------------
    else {
      if (action === ACTION.ADD) {
        updateQuery = { $addToSet: { [field]: value } };
      }
      if (action === ACTION.DELETE) {
        updateQuery = { $pull: { [field]: value } };
      }
    }

    delete payload.arrayAction;

    const updated = await Car.findOneAndUpdate({ _id: carId }, updateQuery, {
      new: true,
    });

    if (!updated) {
      throw new ApiError(404, "Car not found or not owned by user");
    }

    return updated;
  }

  // -------------------------- Handle normal updates --------------------------
  const cleanPayload = removeUndefined(payload);
  delete (cleanPayload as any).userId;

  const updated = await Car.findOneAndUpdate({ _id: carId }, cleanPayload, {
    new: true,
  });

  if (!updated) {
    throw new ApiError(404, "Car not found or not owned by user");
  }

  // notify admin
  const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
    "_id name",
  );

  if (admin) {
    await sendNotifications({
      text: `Car updated successfully by admin (${admin.name || admin._id})`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: updated._id.toString(),
    });
  }

  return updated;
};

const deleteCarByIdFromDB = async (id: string) => {
  // -------------------------- Check host --------------------------
  const result = await Car.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete car by this ID");
  }

  // -------------------------- NOTIFICATIONS --------------------------

  const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
    "_id name",
  );

  if (admin) {
    await sendNotifications({
      text: `Car deleted successfully by admin (${admin.name || admin._id})`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: result._id.toString(),
    });
  }

  return result;
};

// ---APP---
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
    bookingStatus: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ONGOING] },
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

export interface IBlockedDate {
  date: Date;
  reason?: string;
}

const createCarBlockedDatesToDB = async (
  carId: string,
  payload: IBlockedDate[],
) => {
  // Ensure car belongs to this host
  const car = await Car.findOne({ _id: carId }).select("blockedDates");
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

// Helper function to parse query parameters
const parseQueryParams = (params: any) => {
  const {
    lat,
    lng,
    maxDistanceKm,
    limit,
    country,
    state,
    city,
    minPrice,
    maxPrice,
    searchTerm,
    brand,
    transmission,
    fuelType,
    seatNumber,
    minYear,
    maxYear,
    facilities,
    availableDays,
    sortBy = "price",
    sortOrder = "asc",
    userId,
    pickupDateTime,
    returnDateTime,
  } = params;

  // Parse facilities (comma-separated string to array)
  let parsedFacilities: string[] | undefined;
  if (facilities && typeof facilities === "string") {
    parsedFacilities = facilities.split(",").map((f: string) => f.trim());
  }

  // Parse available days (comma-separated string to array)
  let parsedAvailableDays: string[] | undefined;
  if (availableDays && typeof availableDays === "string") {
    parsedAvailableDays = availableDays.split(",").map((d: string) => d.trim());
  }

  // Parse transmission (single or multiple)
  let parsedTransmission: string[] | string | undefined;
  if (transmission && typeof transmission === "string") {
    parsedTransmission = transmission.includes(",")
      ? transmission.split(",").map((t: string) => t.trim())
      : transmission;
  }

  // Parse fuel type (single or multiple)
  let parsedFuelType: string[] | string | undefined;
  if (fuelType && typeof fuelType === "string") {
    parsedFuelType = fuelType.includes(",")
      ? fuelType.split(",").map((f: string) => f.trim())
      : fuelType;
  }

  // Parse seat number (single or multiple)
  let parsedSeatNumber: number[] | number | undefined;
  if (seatNumber) {
    if (typeof seatNumber === "string" && seatNumber.includes(",")) {
      parsedSeatNumber = seatNumber
        .split(",")
        .map((s: string) => Number(s.trim()));
    } else {
      parsedSeatNumber = Number(seatNumber);
    }
  }

  return {
    lat: lat ? Number(lat) : undefined,
    lng: lng ? Number(lng) : undefined,
    userId,
    maxDistanceKm: maxDistanceKm ? Number(maxDistanceKm) : undefined,
    limit: limit ? Number(limit) : 20,
    country: country as string,
    state: state as string,
    city: city as string,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    searchTerm: searchTerm as string,
    brand: brand as string,
    transmission: parsedTransmission,
    fuelType: parsedFuelType,
    seatNumber: parsedSeatNumber,
    minYear: minYear ? Number(minYear) : undefined,
    maxYear: maxYear ? Number(maxYear) : undefined,
    facilities: parsedFacilities,
    availableDays: parsedAvailableDays,
    sortBy: sortBy as string,
    sortOrder: sortOrder as string,
    pickupDateTime:
      typeof pickupDateTime === "string" ? pickupDateTime : undefined,
    returnDateTime:
      typeof returnDateTime === "string" ? returnDateTime : undefined,
  };
};

// Main service function
const getNearbyCarsFromDB = async (params: any) => {
  const parsedParams = parseQueryParams(params);

  const {
    lat,
    lng,
    userId,
    maxDistanceKm,
    limit,
    country,
    state,
    city,
    minPrice,
    maxPrice,
    searchTerm,
    brand,
    transmission,
    fuelType,
    seatNumber,
    minYear,
    maxYear,
    facilities,
    availableDays,
    sortBy,
    sortOrder,
    pickupDateTime,
    returnDateTime,
  } = parsedParams;

  // ১. Target location only if lat/lng provided
  let targetLocation: { lat?: number; lng?: number } = {};
  if (lat != null && lng != null) {
    targetLocation = await getTargetLocation(lat, lng, userId);
  }

  // ২. Build query filters
  const queryFilters: any = {
    isActive: true,
    blockedDates: { $not: { $elemMatch: { date: new Date() } } },
  };

  // Search term
  if (searchTerm && searchTerm.trim()) {
    const searchRegex = new RegExp(searchTerm.trim(), "i");
    queryFilters.$or = [
      { brand: searchRegex },
      { model: searchRegex },
      { city: searchRegex },
      { state: searchRegex },
      { country: searchRegex },
      { color: searchRegex },
      { shortDescription: searchRegex },
      { about: searchRegex },
    ];
  }

  // Location filters
  if (city && city.trim()) {
    queryFilters.city = { $regex: new RegExp(`^${city.trim()}$`, "i") };
  }
  if (state && state.trim()) {
    queryFilters.state = { $regex: new RegExp(`^${state.trim()}$`, "i") };
  }
  if (country && country.trim()) {
    queryFilters.country = { $regex: new RegExp(`^${country.trim()}$`, "i") };
  }

  // Brand filter
  if (brand && brand.trim()) {
    queryFilters.brand = { $regex: new RegExp(`^${brand.trim()}$`, "i") };
  }

  // Transmission filter
  if (transmission) {
    queryFilters.transmission = Array.isArray(transmission)
      ? { $in: transmission }
      : transmission;
  }

  // Fuel type filter
  if (fuelType) {
    queryFilters.fuelType = Array.isArray(fuelType)
      ? { $in: fuelType }
      : fuelType;
  }

  // Seat number filter
  if (seatNumber != null) {
    queryFilters.seatNumber = Array.isArray(seatNumber)
      ? { $in: seatNumber.map(Number) }
      : Number(seatNumber);
  }

  // Year range filter
  if (minYear != null || maxYear != null) {
    queryFilters.year = {};
    if (minYear != null) queryFilters.year.$gte = Number(minYear);
    if (maxYear != null) queryFilters.year.$lte = Number(maxYear);
  }

  // Price range filter
  if (minPrice != null || maxPrice != null) {
    queryFilters.dailyPrice = {};
    if (minPrice != null) queryFilters.dailyPrice.$gte = Number(minPrice);
    if (maxPrice != null) queryFilters.dailyPrice.$lte = Number(maxPrice);
  }

  // Facilities filter
  if (facilities && Array.isArray(facilities) && facilities.length > 0) {
    queryFilters["facilities.value"] = { $all: facilities };
  }

  // Available days filter
  if (
    availableDays &&
    Array.isArray(availableDays) &&
    availableDays.length > 0
  ) {
    queryFilters.availableDays = { $all: availableDays };
  }

  // ৩. Build aggregation pipeline
  const pipeline: any[] = [];

  // $geoNear only if coordinates exist
  if (targetLocation.lat != null && targetLocation.lng != null) {
    pipeline.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [targetLocation.lng, targetLocation.lat],
        },
        distanceField: "distanceInMeters",
        maxDistance: maxDistanceKm ? Number(maxDistanceKm) * 1000 : undefined,
        spherical: true,
        query: queryFilters,
      },
    });

    pipeline.push({
      $addFields: {
        distanceInKm: { $round: [{ $divide: ["$distanceInMeters", 1000] }, 2] },
      },
    });
  } else {
    pipeline.push({ $match: queryFilters });
    pipeline.push({ $addFields: { distanceInKm: null } });
  }

  // Exclude unnecessary fields
  pipeline.push({
    $project: {
      distanceInMeters: 0,
      assignedHosts: 0,
      carRegistrationPaperFrontPic: 0,
      carRegistrationPaperBackPic: 0,
      vin: 0,
    },
  });

  // Dynamic sorting
  const sortOptions: any = {};

  if (
    targetLocation.lat != null &&
    targetLocation.lng != null &&
    sortBy === "distance"
  ) {
    sortOptions.distanceInKm = sortOrder === "desc" ? -1 : 1;
  } else if (sortBy === "price") {
    sortOptions.dailyPrice = sortOrder === "desc" ? -1 : 1;
  } else if (sortBy === "year") {
    sortOptions.year = sortOrder === "desc" ? -1 : 1;
  } else if (sortBy === "seats") {
    sortOptions.seatNumber = sortOrder === "desc" ? -1 : 1;
  } else {
    // Default sorting
    if (targetLocation.lat != null && targetLocation.lng != null) {
      sortOptions.distanceInKm = 1;
      sortOptions.dailyPrice = 1;
    } else {
      sortOptions.dailyPrice = 1;
      sortOptions.brand = 1;
    }
  }

  pipeline.push({ $sort: sortOptions });
  pipeline.push({ $limit: Number(limit) || 20 });

  // ৪. Execute aggregation
  const cars = await Car.aggregate(pipeline);

  let filteredCars = cars;

  if (pickupDateTime && returnDateTime) {
    const from = new Date(pickupDateTime);
    const to = new Date(returnDateTime);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new ApiError(400, "Invalid pickup or return datetime");
    }

    if (from >= to) {
      throw new ApiError(400, "Return datetime must be after pickup datetime");
    }

    const availabilityFlags = await Promise.all(
      cars.map(async (car) => {
        try {
          await validateAvailabilityStrict(car._id.toString(), from, to);
          return true;
        } catch {
          return false;
        }
      }),
    );

    filteredCars = cars.filter((_, index) => availabilityFlags[index]);
  }

  // -------------------- REVIEWS --------------------
  const hostIds = filteredCars
    .map((c) => c.assignedHosts)
    .filter(Boolean)
    .map((id) => id.toString());
  let reviewMap: Map<string, any> = new Map();
  if (hostIds.length > 0) {
    reviewMap = await ReviewServices.getBulkReviewSummary(
      hostIds,
      REVIEW_TARGET_TYPE.HOST,
    );
  }

  // -------------------- TRIPS --------------------
  const tripCountMap = await getCarTripCountMap(filteredCars.map((c) => c._id));
  filteredCars.forEach((car) => {
    (car as any).trips = tripCountMap[car._id.toString()] ?? 0;
  });

  // -------------------- FAVORITES + Attach reviews --------------------
  if (userId && filteredCars.length > 0) {
    const carIds = filteredCars.map((c) => c._id);
    const favorites = await FavoriteCar.find({
      userId,
      referenceId: { $in: carIds },
    }).select("referenceId");
    const favMap = new Map(
      favorites.map((f) => [f.referenceId.toString(), true]),
    );

    filteredCars.forEach((car) => {
      car.isFavorite = !!favMap.get(car._id.toString());
      const hostId = car.assignedHosts?.toString();
      const review = hostId ? reviewMap.get(hostId) : null;

      car.averageRating = review?.averageRating ?? 0;
      car.totalReviews = review?.totalReviews ?? 0;
      car.starCounts = review?.starCounts ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      car.reviews = review?.reviews ?? [];
    });
  } else {
    filteredCars.forEach((car) => {
      car.isFavorite = false;
      car.averageRating = 0;
      car.totalReviews = 0;
      car.starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      car.reviews = [];
    });
  }

  // ✅ NEW: Bulk check — which cars has this user paid for?
  let paidCarIds = new Set<string>();

  if (userId && filteredCars.length > 0) {
    const carIds = filteredCars.map((c) => c._id);

    // Find all paid bookings for this user across these cars
    const paidBookings = await Booking.find({
      carId: { $in: carIds },
      userId: new Types.ObjectId(userId),
      bookingStatus: {
        $in: [
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.ONGOING,
          BOOKING_STATUS.COMPLETED,
        ],
      },
    })
      .select("carId transactionId isSelfBooking")
      .populate({ path: "transactionId", select: "status" })
      .lean();

    for (const booking of paidBookings) {
      const transaction = booking.transactionId as any;
      const isPaid = transaction?.status === TRANSACTION_STATUS.SUCCESS;
      if (isPaid) {
        paidCarIds.add((booking.carId as any).toString());
      }
    }
  }

  // Attach hasUserPaid to each car
  filteredCars.forEach((car) => {
    car.hasUserPaid = paidCarIds.has(car._id.toString()); // ✅
  });

  return {
    cars: filteredCars,
    total: filteredCars.length,
    filters: {
      location: { lat, lng, maxDistanceKm, country, state, city },
      price: { minPrice, maxPrice },
      search: searchTerm,
      vehicle: { brand, transmission, fuelType, seatNumber, minYear, maxYear },
      preferences: { facilities, availableDays },
      timeRange: { pickupDateTime, returnDateTime },
      sorting: { sortBy, sortOrder },
    },
  };
};

const getCarByIdForUserFromDB = async (id: string, userId: string) => {
  const car = await Car.findById(id).populate("assignedHosts");

  if (!car) {
    return null;
  }

  // Favorite check
  const isBookmarked = await FavoriteCar.exists({
    userId,
    referenceId: id,
  });

  const now = new Date();
  const isAvailable = await checkCarAvailabilityByDate(car, now);
  const availabilityCalendar = await getCarCalendar(id);
  const trips = await getCarTripCount(id);

  // HOST review (safe handling)
  let reviewSummary: IReviewSummary = {
    averageRating: 0,
    totalReviews: 0,
    starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviews: [],
  };

  let totalBookings = 0;
  let successRate = 0;

  if (car.assignedHosts) {
    reviewSummary = await ReviewServices.getReviewSummary(
      car.assignedHosts._id.toString(),
      REVIEW_TARGET_TYPE.HOST,
    );

    totalBookings = await Booking.countDocuments({
      hostId: car.assignedHosts._id,
    });
    const completedBookings = await Booking.countDocuments({
      hostId: car.assignedHosts._id,
      bookingStatus: { $in: [BOOKING_STATUS.COMPLETED] },
    });
    successRate =
      totalBookings > 0
        ? Math.round((completedBookings / totalBookings) * 100)
        : 0;
  }

  //  Check if this user has a successful payment for this car
  const hasUserPaid = await checkIfUserHasPaid(id, userId);

  return {
    ...car.toObject(),
    hasUserPaid,
    trips: trips || 0,
    isAvailable,
    availabilityCalendar,
    isFavorite: Boolean(isBookmarked),
    averageRating: reviewSummary.averageRating,
    totalReviews: reviewSummary.totalReviews,
    starCounts: reviewSummary.starCounts,
    reviews: reviewSummary.reviews,
    totalBookings,
    successRate,
  };
};

const getCarsByHostFromDB = async (hostId: string) => {
  if (!hostId || !Types.ObjectId.isValid(hostId)) {
    throw new ApiError(400, "Invalid hostId");
  }

  const objectHostId = new Types.ObjectId(hostId);

  // Single car fetch
  const car = await Car.findOne({
    assignedHosts: hostId,
    isActive: true,
  }).lean();

  if (!car) {
    throw new ApiError(404, "No active car found for this host");
  }

  // -------------------- FAVORITE --------------------
  const isBookmarked = await FavoriteCar.exists({
    userId: objectHostId,
    referenceId: car._id,
  });

  (car as any).isFavorite = !!isBookmarked;

  const availabilityCalendar = await getCarCalendar(car._id.toString());

  // -------------------- TRIPS --------------------
  const tripCount = await getCarTripCount(car._id);
  // (car as any).trips = tripCountMap[car._id.toString()] ?? 0;
  (car as any).trips = tripCount ?? 0;

  // -------------------- REVIEWS --------------------
  const reviewSummary = await ReviewServices.getReviewSummary(
    hostId,
    REVIEW_TARGET_TYPE.HOST,
  );

  (car as any).averageRating = reviewSummary?.averageRating ?? 0;
  (car as any).totalReviews = reviewSummary?.totalReviews ?? 0;
  (car as any).starCounts = reviewSummary?.starCounts ?? {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  (car as any).reviews = reviewSummary?.reviews ?? [];

  // -------------------- HOST TOTAL EARNING --------------------
  const earningResult = await Transaction.aggregate([
    {
      $match: {
        type: TRANSACTION_TYPE.BOOKING,
        status: TRANSACTION_STATUS.SUCCESS,
      },
    },
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking",
      },
    },
    { $unwind: "$booking" },
    {
      $match: {
        "booking.hostId": objectHostId,
        "booking.bookingStatus": BOOKING_STATUS.COMPLETED,
      },
    },
    {
      $group: {
        _id: null,
        totalEarning: { $sum: "$charges.hostCommission" },
      },
    },
  ]);

  (car as any).hostTotalEarning = earningResult[0]?.totalEarning ?? 0;

  return {
    ...car,
    availabilityCalendar,
  };
};

export const CarServices = {
  createCarToDB,
  getAllCarsFromDB,
  getCarByIdFromDB,
  getAvailability,
  createCarBlockedDatesToDB,
  generateBlockedResponse,
  getBookingBlockedHours,
  getCarByIdForUserFromDB,
  updateCarByIdToDB,
  deleteCarByIdFromDB,
  getNearbyCarsFromDB,
  getCarsByHostFromDB,
};