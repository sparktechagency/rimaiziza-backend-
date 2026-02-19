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
exports.validateAvailabilityStrict =
  exports.generateRequestedHours =
  exports.getLocalDetails =
  exports.getCarTripCountMap =
  exports.getCarTripCount =
  exports.getCarCalendar =
  exports.checkCarAvailabilityByDate =
  exports.attachFavoriteToCar =
  exports.getTargetLocation =
    void 0;
const mongoose_1 = require("mongoose");
const user_model_1 = require("../user/user.model");
const favoriteCar_model_1 = require("../favoriteCar/favoriteCar.model");
const booking_model_1 = require("../booking/booking.model");
const booking_interface_1 = require("../booking/booking.interface");
const car_service_1 = require("./car.service");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const car_model_1 = require("./car.model");
const getTargetLocation = (queryLat, queryLng, userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let lat = queryLat ? Number(queryLat) : null;
    let lng = queryLng ? Number(queryLng) : null;
    if ((!lat || !lng) && userId) {
      const user = yield user_model_1.User.findById(userId).select("location");
      if (
        (_a = user === null || user === void 0 ? void 0 : user.location) ===
          null || _a === void 0
          ? void 0
          : _a.coordinates
      ) {
        lng = user.location.coordinates[0];
        lat = user.location.coordinates[1];
      }
    }
    // default dhaka
    if (!lat || !lng) {
      lng = 90.4125;
      lat = 21.8103;
    }
    return { lat, lng };
  });
exports.getTargetLocation = getTargetLocation;
const attachFavoriteToCar = (car, userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!userId || !mongoose_1.Types.ObjectId.isValid(userId)) {
      return Object.assign(Object.assign({}, car), { isFavorite: false });
    }
    const favorite = yield favoriteCar_model_1.FavoriteCar.findOne({
      userId,
      referenceId: car._id,
    }).lean();
    return Object.assign(Object.assign({}, car), { isFavorite: !!favorite });
  });
exports.attachFavoriteToCar = attachFavoriteToCar;
const checkCarAvailabilityByDate = (car, targetDate) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Car inactive
    if (!car.isActive) return false;
    // Check availableDays
    const dayName = targetDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase();
    if (
      ((_a = car.availableDays) === null || _a === void 0
        ? void 0
        : _a.length) &&
      !car.availableDays.includes(dayName)
    ) {
      return false;
    }
    // Check blockedDates
    const dateString = targetDate.toISOString().split("T")[0];
    const isBlocked =
      (_b = car.blockedDates) === null || _b === void 0
        ? void 0
        : _b.some(
            (b) => new Date(b.date).toISOString().split("T")[0] === dateString,
          );
    if (isBlocked) return false;
    // Check booking conflicts
    const bookingConflict = yield booking_model_1.Booking.findOne({
      carId: car._id,
      bookingStatus: {
        $in: [
          booking_interface_1.BOOKING_STATUS.CONFIRMED,
          booking_interface_1.BOOKING_STATUS.ONGOING,
        ],
      },
      fromDate: { $lte: targetDate },
      toDate: { $gte: targetDate },
    });
    return !bookingConflict;
  });
exports.checkCarAvailabilityByDate = checkCarAvailabilityByDate;
const getCarCalendar = (carId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const calendar = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dateString = targetDate.toISOString().split("T")[0];
      // if any slot is available for that date
      const availability = yield car_service_1.CarServices.getAvailability(
        carId,
        dateString,
      );
      // if at least `1` slot is available
      const isAnySlotAvailable = availability.slots.some(
        (slot) => slot.isAvailable === true,
      );
      calendar.push({
        date: dateString,
        available: isAnySlotAvailable,
        reason:
          availability.blockedReason ||
          (isAnySlotAvailable ? "" : "Fully Booked"),
      });
    }
    return calendar;
  });
exports.getCarCalendar = getCarCalendar;
const getCarTripCount = (carId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const count = yield booking_model_1.Booking.countDocuments({
      carId: new mongoose_1.Types.ObjectId(carId),
      bookingStatus: booking_interface_1.BOOKING_STATUS.CONFIRMED,
      isCanceledByHost: { $ne: true },
      isCanceledByUser: { $ne: true },
    });
    return count;
  });
exports.getCarTripCount = getCarTripCount;
// bulk car trip
const getCarTripCountMap = (carIds) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result = yield booking_model_1.Booking.aggregate([
      {
        $match: {
          carId: { $in: carIds },
          bookingStatus: booking_interface_1.BOOKING_STATUS.CONFIRMED,
          isCanceledByHost: { $ne: true },
          isCanceledByUser: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$carId",
          count: { $sum: 1 },
        },
      },
    ]);
    const map = {};
    for (const item of result) {
      map[item._id.toString()] = item.count;
    }
    return map;
  });
exports.getCarTripCountMap = getCarTripCountMap;
const getLocalDetails = (date) => {
  // Use System Local Time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return {
    dateStr: `${year}-${month}-${day}`,
    hour: date.getHours(),
    weekday: date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase(),
  };
};
exports.getLocalDetails = getLocalDetails;
const generateRequestedHours = (from, to) => {
  const hours = [];
  const cursor = new Date(from); // ensure Date object
  while (cursor.getTime() < to.getTime()) {
    // Push Local date and hour
    const local = (0, exports.getLocalDetails)(cursor);
    hours.push({
      date: local.dateStr,
      hour: local.hour,
    });
    // Increment 1 hour
    cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
  }
  console.log(hours, "HOURS");
  return hours;
};
exports.generateRequestedHours = generateRequestedHours;
// Full strict availability check
const validateAvailabilityStrict = (carId, from, to) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (from >= to)
      throw new ApiErrors_1.default(400, "Invalid booking time range");
    // Fetch car
    const car = yield car_model_1.Car.findById(carId).select(
      "isActive availableDays availableHours defaultStartTime defaultEndTime blockedDates",
    );
    console.log(car, "CAR");
    if (!car) throw new ApiErrors_1.default(404, "Car not found");
    if (!car.isActive) throw new ApiErrors_1.default(400, "Car is not active");
    const fromDate = from instanceof Date ? from : new Date(from);
    const toDate = to instanceof Date ? to : new Date(to);
    if (fromDate >= toDate) {
      throw new ApiErrors_1.default(400, "Invalid booking time range");
    }
    const requestedSlots = (0, exports.generateRequestedHours)(
      fromDate,
      toDate,
    );
    console.log(requestedSlots, "REQUESTED SLOTS");
    // Group slots by date
    const dateMap = requestedSlots.reduce((map, slot) => {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot.hour);
      return map;
    }, {});
    console.log(dateMap, "DATE MAP");
    for (const [date, hours] of Object.entries(dateMap)) {
      // 1️⃣ Check blockedDates
      const blockedEntry =
        (_a = car.blockedDates) === null || _a === void 0
          ? void 0
          : _a.find(
              (b) => new Date(b.date).toISOString().split("T")[0] === date,
            );
      if (blockedEntry) {
        throw new ApiErrors_1.default(
          400,
          `Car blocked on ${date}: ${blockedEntry.reason || "Blocked by host"}`,
        );
      }
      // 2️⃣ Check availableDays
      const dayName = new Date(date)
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();
      if (
        ((_b = car.availableDays) === null || _b === void 0
          ? void 0
          : _b.length) &&
        !car.availableDays.includes(dayName)
      ) {
        throw new ApiErrors_1.default(
          400,
          `Car not available on ${date} (${dayName})`,
        );
      }
      console.log(dayName, "DAY NAME");
      // 3️⃣ Build openHoursSet
      const openHoursSet = new Set();
      if (
        (_c = car.availableHours) === null || _c === void 0 ? void 0 : _c.length
      ) {
        car.availableHours.forEach((t) => {
          const h = parseInt(t.split(":")[0], 10);
          if (!isNaN(h) && h >= 0 && h <= 23) openHoursSet.add(h);
        });
      } else if (car.defaultStartTime && car.defaultEndTime) {
        const start = parseInt(car.defaultStartTime.split(":")[0], 10);
        const end = parseInt(car.defaultEndTime.split(":")[0], 10) || 24;
        for (let h = start; h < end; h++) openHoursSet.add(h % 24);
      } else {
        for (let i = 0; i < 24; i++) openHoursSet.add(i);
      }
      // 4️⃣ Fetch conflicting bookings for this date
      // Widen search window to handle timezone overlaps
      // Parse "YYYY-MM-DD" to Local Start of Day
      const [y, m, d] = date.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d, 0, 0, 0, 0); // Local 00:00:00
      const dateStart = new Date(dateObj);
      dateStart.setDate(dateStart.getDate() - 1); // -1 day
      const dateEnd = new Date(dateObj);
      dateEnd.setDate(dateEnd.getDate() + 2); // +2 days
      const bookings = yield booking_model_1.Booking.find({
        carId: new mongoose_1.Types.ObjectId(carId),
        bookingStatus: {
          $in: [
            booking_interface_1.BOOKING_STATUS.CONFIRMED,
            booking_interface_1.BOOKING_STATUS.ONGOING,
          ],
        },
        fromDate: { $lt: dateEnd },
        toDate: { $gt: dateStart },
      }).select("fromDate toDate");
      // Build booked hours (Local)
      const bookedHours = new Set();
      bookings.forEach((b) => {
        const bStart = new Date(
          Math.max(b.fromDate.getTime(), dateStart.getTime()),
        );
        const bEnd = new Date(Math.min(b.toDate.getTime(), dateEnd.getTime()));
        const cursor = new Date(bStart);
        while (cursor < bEnd) {
          const local = (0, exports.getLocalDetails)(cursor);
          // Only mark as booked if it matches the current checking date
          if (local.dateStr === date) {
            bookedHours.add(local.hour);
          }
          cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
        }
      });
      // 5️⃣ Validate requested hours
      for (const hour of hours) {
        if (!openHoursSet.has(hour)) {
          throw new ApiErrors_1.default(
            400,
            `Car not available on ${date} at ${String(hour).padStart(2, "0")}:00 (outside operating hours)`,
          );
        }
        if (bookedHours.has(hour)) {
          throw new ApiErrors_1.default(
            400,
            `Car already booked on ${date} at ${String(hour).padStart(2, "0")}:00`,
          );
        }
      }
    }
    return true; // all good
  });
exports.validateAvailabilityStrict = validateAvailabilityStrict;
