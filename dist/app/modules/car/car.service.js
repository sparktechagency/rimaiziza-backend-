"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarServices = exports.ACTION = void 0;
const mongoose_1 = require("mongoose");
const user_1 = require("../../../enums/user");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const user_model_1 = require("../user/user.model");
const car_model_1 = require("./car.model");
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
const generateYearBasedId_1 = require("../../../helpers/generateYearBasedId");
const car_utils_1 = require("./car.utils");
const favoriteCar_model_1 = require("../favoriteCar/favoriteCar.model");
const booking_model_1 = require("../booking/booking.model");
const booking_interface_1 = require("../booking/booking.interface");
const review_service_1 = require("../review/review.service");
const review_interface_1 = require("../review/review.interface");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const createCarToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const carId = yield (0, generateYearBasedId_1.generateVehicleId)();
    payload.vehicleId = carId;
    if ((_a = payload.facilities) === null || _a === void 0 ? void 0 : _a.length) {
        payload.facilities.forEach(facility => {
            if (!facility.label || !facility.value) {
                throw new ApiErrors_1.default(400, "Each facility must have label and value");
            }
        });
    }
    const result = yield car_model_1.Car.create(payload);
    return result;
});
const getAllCarsFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseQuery = car_model_1.Car.find().populate("assignedHosts", "name email role profileImage membershipId");
    const queryBuilder = new queryBuilder_1.default(baseQuery, query).search(["vehicleId", "brand", "model", "licensePlate"]).sort().paginate();
    const cars = yield queryBuilder.modelQuery;
    if (!cars.length) {
        throw new ApiErrors_1.default(404, "No cars found");
    }
    const meta = yield queryBuilder.countTotal();
    return {
        meta,
        cars
    };
});
const getCarByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield car_model_1.Car.findById(id);
    if (!result) {
        throw new ApiErrors_1.default(404, "Car not found");
    }
    return result;
});
var ACTION;
(function (ACTION) {
    ACTION["ADD"] = "ADD";
    ACTION["DELETE"] = "DELETE";
})(ACTION || (exports.ACTION = ACTION = {}));
// -------------------------- Utility --------------------------
const removeUndefined = (obj) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null));
// -------------------------- Main Update Function --------------------------
const updateCarByIdToDB = (carId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // -------------------------- Check user --------------------------
    const user = yield user_model_1.User.findOne({
        role: { $in: [user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN] },
        verified: true,
        status: user_1.STATUS.ACTIVE,
    });
    if (!user) {
        throw new ApiErrors_1.default(404, "No approved host found by this ID");
    }
    // -------------------------- Handle array actions --------------------------
    if (payload.arrayAction) {
        const { field, action, value } = payload.arrayAction;
        const allowedFields = ["images", "availableDays", "facilities"];
        if (!allowedFields.includes(field)) {
            throw new ApiErrors_1.default(400, "Invalid array field");
        }
        let updateQuery = {};
        // -------------------------- Facilities --------------------------
        if (field === "facilities") {
            const isFacilityPayload = (val) => typeof val === "object" && val !== null && "label" in val && "value" in val;
            if (action === ACTION.ADD) {
                if (!isFacilityPayload(value)) {
                    throw new ApiErrors_1.default(400, "Invalid facility payload");
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
                    throw new ApiErrors_1.default(400, "Facility value must be string");
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
        const updated = yield car_model_1.Car.findOneAndUpdate({ _id: carId }, updateQuery, { new: true });
        if (!updated) {
            throw new ApiErrors_1.default(404, "Car not found or not owned by user");
        }
        return updated;
    }
    // -------------------------- Handle normal updates --------------------------
    const cleanPayload = removeUndefined(payload);
    delete cleanPayload.userId;
    const updated = yield car_model_1.Car.findOneAndUpdate({ _id: carId }, cleanPayload, { new: true });
    if (!updated) {
        throw new ApiErrors_1.default(404, "Car not found or not owned by user");
    }
    return updated;
});
const deleteCarByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    // -------------------------- Check host --------------------------
    const result = yield car_model_1.Car.findByIdAndDelete(id);
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to delete car by this ID");
    }
    // -------------------------- NOTIFICATIONS --------------------------
    const admin = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.SUPER_ADMIN }).select("_id");
    if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
            text: `Car deleted successfully by admin (${admin.phone || admin._id})`,
            receiver: admin._id.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
            referenceId: result._id.toString(),
        });
    }
    return result;
});
// ---APP---
const getAvailability = (carId, dateString) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    // ---------- Normalize Date (UTC Day) ----------
    const targetDate = new Date(dateString);
    const normalizedDate = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
    // ---------- Fetch Car ----------
    const car = yield car_model_1.Car.findById(carId).select("isActive availableDays availableHours defaultStartTime defaultEndTime blockedDates");
    if (!car)
        throw new ApiErrors_1.default(404, "Car not found");
    if (!car.isActive) {
        return generateBlockedResponse(normalizedDate, "Car is not active");
    }
    // ---------- Priority 1: Manual Full Day Block ----------
    const blockedEntry = (_a = car.blockedDates) === null || _a === void 0 ? void 0 : _a.find((b) => new Date(b.date).toISOString().split("T")[0] ===
        normalizedDate.toISOString().split("T")[0]);
    if (blockedEntry) {
        return generateBlockedResponse(normalizedDate, blockedEntry.reason || "Blocked by host");
    }
    // ---------- Day Availability Check ----------
    const dayName = normalizedDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();
    if (((_b = car.availableDays) === null || _b === void 0 ? void 0 : _b.length) && !car.availableDays.includes(dayName)) {
        return generateBlockedResponse(normalizedDate, "Car not available on this day");
    }
    // ---------- Priority 2: Define Operating Hours ----------
    const openHoursSet = new Set();
    if ((_c = car.availableHours) === null || _c === void 0 ? void 0 : _c.length) {
        car.availableHours.forEach((t) => {
            const h = parseInt(t.split(":")[0], 10);
            if (!isNaN(h) && h >= 0 && h <= 23) {
                openHoursSet.add(h);
            }
        });
    }
    else if (car.defaultStartTime && car.defaultEndTime) {
        const start = parseInt(car.defaultStartTime.split(":")[0], 10);
        const end = parseInt(car.defaultEndTime.split(":")[0], 10) || 24;
        for (let h = start; h < end; h++) {
            openHoursSet.add(h % 24);
        }
    }
    else {
        for (let i = 0; i < 24; i++)
            openHoursSet.add(i);
    }
    // ---------- Priority 3: Booking Conflict ----------
    const bookings = yield booking_model_1.Booking.find({
        carId: new mongoose_1.Types.ObjectId(carId),
        bookingStatus: { $in: [booking_interface_1.BOOKING_STATUS.CONFIRMED, booking_interface_1.BOOKING_STATUS.ONGOING] },
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
});
/**
 * =========================
 * HELPER: BOOKING HOURS
 * =========================
 */
const getBookingBlockedHours = (bookings, date) => {
    const blockedHours = new Set();
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
    const dayEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));
    bookings.forEach((booking) => {
        const start = new Date(Math.max(booking.fromDate.getTime(), dayStart.getTime()));
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
const generateBlockedResponse = (date, reason) => ({
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
const createCarBlockedDatesToDB = (carId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Ensure car belongs to this host
    const car = yield car_model_1.Car.findOne({ _id: carId }).select("blockedDates");
    if (!car)
        throw new ApiErrors_1.default(404, "No car found by this ID");
    // Merge old + new
    const combined = [...(car.blockedDates || []), ...payload];
    // Normalize & remove duplicates by date
    const normalized = Array.from(new Map(combined.map((item) => [
        new Date(item.date).toISOString().split("T")[0], // unique key YYYY-MM-DD
        { date: new Date(item.date), reason: item.reason || "" },
    ])).values());
    // Update DB
    const result = yield car_model_1.Car.findByIdAndUpdate(carId, { blockedDates: normalized }, { new: true });
    if (!result)
        throw new ApiErrors_1.default(400, "Failed to update blocked dates");
    return result;
});
// Helper function to parse query parameters
const parseQueryParams = (params) => {
    const { lat, lng, maxDistanceKm, limit, country, state, city, minPrice, maxPrice, searchTerm, brand, transmission, fuelType, seatNumber, minYear, maxYear, facilities, availableDays, sortBy = "price", sortOrder = "asc", userId, } = params;
    // Parse facilities (comma-separated string to array)
    let parsedFacilities;
    if (facilities && typeof facilities === "string") {
        parsedFacilities = facilities.split(",").map((f) => f.trim());
    }
    // Parse available days (comma-separated string to array)
    let parsedAvailableDays;
    if (availableDays && typeof availableDays === "string") {
        parsedAvailableDays = availableDays.split(",").map((d) => d.trim());
    }
    // Parse transmission (single or multiple)
    let parsedTransmission;
    if (transmission && typeof transmission === "string") {
        parsedTransmission = transmission.includes(",")
            ? transmission.split(",").map((t) => t.trim())
            : transmission;
    }
    // Parse fuel type (single or multiple)
    let parsedFuelType;
    if (fuelType && typeof fuelType === "string") {
        parsedFuelType = fuelType.includes(",")
            ? fuelType.split(",").map((f) => f.trim())
            : fuelType;
    }
    // Parse seat number (single or multiple)
    let parsedSeatNumber;
    if (seatNumber) {
        if (typeof seatNumber === "string" && seatNumber.includes(",")) {
            parsedSeatNumber = seatNumber.split(",").map((s) => Number(s.trim()));
        }
        else {
            parsedSeatNumber = Number(seatNumber);
        }
    }
    return {
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        userId,
        maxDistanceKm: maxDistanceKm ? Number(maxDistanceKm) : undefined,
        limit: limit ? Number(limit) : 20,
        country: country,
        state: state,
        city: city,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        searchTerm: searchTerm,
        brand: brand,
        transmission: parsedTransmission,
        fuelType: parsedFuelType,
        seatNumber: parsedSeatNumber,
        minYear: minYear ? Number(minYear) : undefined,
        maxYear: maxYear ? Number(maxYear) : undefined,
        facilities: parsedFacilities,
        availableDays: parsedAvailableDays,
        sortBy: sortBy,
        sortOrder: sortOrder,
    };
};
// Main service function
const getNearbyCarsFromDB = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedParams = parseQueryParams(params);
    const { lat, lng, userId, maxDistanceKm, limit, country, state, city, minPrice, maxPrice, searchTerm, brand, transmission, fuelType, seatNumber, minYear, maxYear, facilities, availableDays, sortBy, sortOrder, } = parsedParams;
    // ১. Target location only if lat/lng provided
    let targetLocation = {};
    if (lat != null && lng != null) {
        targetLocation = yield (0, car_utils_1.getTargetLocation)(lat, lng, userId);
    }
    // ২. Build query filters
    const queryFilters = {
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
        queryFilters.fuelType = Array.isArray(fuelType) ? { $in: fuelType } : fuelType;
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
        if (minYear != null)
            queryFilters.year.$gte = Number(minYear);
        if (maxYear != null)
            queryFilters.year.$lte = Number(maxYear);
    }
    // Price range filter
    if (minPrice != null || maxPrice != null) {
        queryFilters.dailyPrice = {};
        if (minPrice != null)
            queryFilters.dailyPrice.$gte = Number(minPrice);
        if (maxPrice != null)
            queryFilters.dailyPrice.$lte = Number(maxPrice);
    }
    // Facilities filter
    if (facilities && Array.isArray(facilities) && facilities.length > 0) {
        queryFilters["facilities.value"] = { $all: facilities };
    }
    // Available days filter
    if (availableDays && Array.isArray(availableDays) && availableDays.length > 0) {
        queryFilters.availableDays = { $all: availableDays };
    }
    // ৩. Build aggregation pipeline
    const pipeline = [];
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
    }
    else {
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
    const sortOptions = {};
    if (targetLocation.lat != null && targetLocation.lng != null && sortBy === "distance") {
        sortOptions.distanceInKm = sortOrder === "desc" ? -1 : 1;
    }
    else if (sortBy === "price") {
        sortOptions.dailyPrice = sortOrder === "desc" ? -1 : 1;
    }
    else if (sortBy === "year") {
        sortOptions.year = sortOrder === "desc" ? -1 : 1;
    }
    else if (sortBy === "seats") {
        sortOptions.seatNumber = sortOrder === "desc" ? -1 : 1;
    }
    else {
        // Default sorting
        if (targetLocation.lat != null && targetLocation.lng != null) {
            sortOptions.distanceInKm = 1;
            sortOptions.dailyPrice = 1;
        }
        else {
            sortOptions.dailyPrice = 1;
            sortOptions.brand = 1;
        }
    }
    pipeline.push({ $sort: sortOptions });
    pipeline.push({ $limit: Number(limit) || 20 });
    // ৪. Execute aggregation
    const cars = yield car_model_1.Car.aggregate(pipeline);
    // ৫. Attach isFavorite
    // if (userId && cars.length > 0) {
    //     const carIds = cars.map((car) => car._id);
    //     const favorites = await FavoriteCar.find({
    //         userId,
    //         referenceId: { $in: carIds },
    //     }).select("referenceId");
    //     const favMap = new Map(favorites.map((f) => [f.referenceId.toString(), true]));
    //     cars.forEach((car) => {
    //         car.isFavorite = !!favMap.get(car._id.toString());
    //     });
    // } else {
    //     cars.forEach((car) => (car.isFavorite = false));
    // }
    // -------------------- REVIEWS --------------------
    const hostIds = cars.map((c) => c.assignedHosts).filter(Boolean).map((id) => id.toString());
    let reviewMap = new Map();
    if (hostIds.length > 0) {
        reviewMap = yield review_service_1.ReviewServices.getBulkReviewSummary(hostIds, review_interface_1.REVIEW_TARGET_TYPE.HOST);
    }
    // -------------------- TRIPS --------------------
    const tripCountMap = yield (0, car_utils_1.getCarTripCountMap)(cars.map((c) => c._id));
    cars.forEach((car) => {
        var _a;
        car.trips = (_a = tripCountMap[car._id.toString()]) !== null && _a !== void 0 ? _a : 0;
    });
    // -------------------- FAVORITES + Attach reviews --------------------
    if (userId && cars.length > 0) {
        const carIds = cars.map((c) => c._id);
        const favorites = yield favoriteCar_model_1.FavoriteCar.find({ userId, referenceId: { $in: carIds } }).select("referenceId");
        const favMap = new Map(favorites.map((f) => [f.referenceId.toString(), true]));
        cars.forEach((car) => {
            var _a, _b, _c, _d, _e;
            car.isFavorite = !!favMap.get(car._id.toString());
            const hostId = (_a = car.assignedHosts) === null || _a === void 0 ? void 0 : _a.toString();
            const review = hostId ? reviewMap.get(hostId) : null;
            car.averageRating = (_b = review === null || review === void 0 ? void 0 : review.averageRating) !== null && _b !== void 0 ? _b : 0;
            car.totalReviews = (_c = review === null || review === void 0 ? void 0 : review.totalReviews) !== null && _c !== void 0 ? _c : 0;
            car.starCounts = (_d = review === null || review === void 0 ? void 0 : review.starCounts) !== null && _d !== void 0 ? _d : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            car.reviews = (_e = review === null || review === void 0 ? void 0 : review.reviews) !== null && _e !== void 0 ? _e : [];
        });
    }
    else {
        cars.forEach((car) => {
            car.isFavorite = false;
            car.averageRating = 0;
            car.totalReviews = 0;
            car.starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            car.reviews = [];
        });
    }
    return {
        cars,
        total: cars.length,
        filters: {
            location: { lat, lng, maxDistanceKm, country, state, city },
            price: { minPrice, maxPrice },
            search: searchTerm,
            vehicle: { brand, transmission, fuelType, seatNumber, minYear, maxYear },
            preferences: { facilities, availableDays },
            sorting: { sortBy, sortOrder },
        },
    };
});
const getCarByIdForUserFromDB = (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const car = yield car_model_1.Car.findById(id).populate("assignedHosts");
    if (!car) {
        return null;
    }
    // Favorite check
    const isBookmarked = yield favoriteCar_model_1.FavoriteCar.exists({
        userId,
        referenceId: id,
    });
    const now = new Date();
    const isAvailable = yield (0, car_utils_1.checkCarAvailabilityByDate)(car, now);
    const availabilityCalendar = yield (0, car_utils_1.getCarCalendar)(id);
    const trips = yield (0, car_utils_1.getCarTripCount)(id);
    // HOST review (safe handling)
    let reviewSummary = {
        averageRating: 0,
        totalReviews: 0,
        starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        reviews: [],
    };
    let totalBookings = 0;
    let successRate = 0;
    if (car.assignedHosts) {
        reviewSummary = yield review_service_1.ReviewServices.getReviewSummary(car.assignedHosts._id.toString(), review_interface_1.REVIEW_TARGET_TYPE.HOST);
        totalBookings = yield booking_model_1.Booking.countDocuments({ hostId: car.assignedHosts._id });
        const completedBookings = yield booking_model_1.Booking.countDocuments({
            hostId: car.assignedHosts._id,
            bookingStatus: { $in: [booking_interface_1.BOOKING_STATUS.COMPLETED] },
        });
        successRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
    }
    return Object.assign(Object.assign({}, car.toObject()), { trips: trips || 0, isAvailable,
        availabilityCalendar, isFavorite: Boolean(isBookmarked), averageRating: reviewSummary.averageRating, totalReviews: reviewSummary.totalReviews, starCounts: reviewSummary.starCounts, reviews: reviewSummary.reviews, totalBookings,
        successRate });
});
const getCarsByHostFromDB = (hostId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!hostId || !mongoose_1.Types.ObjectId.isValid(hostId)) {
        throw new ApiErrors_1.default(400, "Invalid hostId");
    }
    const cars = yield car_model_1.Car.find({
        assignedHosts: hostId,
        isActive: true,
    }).lean();
    // -------------------- FAVORITES --------------------
    yield Promise.all(cars.map((car) => __awaiter(void 0, void 0, void 0, function* () {
        const isBookmarked = yield favoriteCar_model_1.FavoriteCar.exists({
            userId: new mongoose_1.Types.ObjectId(hostId),
            referenceId: car._id,
        });
        car.isFavorite = !!isBookmarked;
    })));
    // -------------------- TRIPS --------------------
    const tripCountMap = yield (0, car_utils_1.getCarTripCountMap)(cars.map((c) => c._id));
    cars.forEach((car) => {
        var _a;
        car.trips = (_a = tripCountMap[car._id.toString()]) !== null && _a !== void 0 ? _a : 0;
    });
    // -------------------- REVIEWS --------------------
    const reviewSummary = yield review_service_1.ReviewServices.getReviewSummary(hostId, review_interface_1.REVIEW_TARGET_TYPE.HOST);
    cars.forEach((car) => {
        var _a, _b, _c, _d;
        // Virtual / temporary fields
        car.averageRating = (_a = reviewSummary === null || reviewSummary === void 0 ? void 0 : reviewSummary.averageRating) !== null && _a !== void 0 ? _a : 0;
        car.totalReviews = (_b = reviewSummary === null || reviewSummary === void 0 ? void 0 : reviewSummary.totalReviews) !== null && _b !== void 0 ? _b : 0;
        car.starCounts = (_c = reviewSummary === null || reviewSummary === void 0 ? void 0 : reviewSummary.starCounts) !== null && _c !== void 0 ? _c : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        car.reviews = (_d = reviewSummary === null || reviewSummary === void 0 ? void 0 : reviewSummary.reviews) !== null && _d !== void 0 ? _d : [];
    });
    return cars;
});
exports.CarServices = {
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
