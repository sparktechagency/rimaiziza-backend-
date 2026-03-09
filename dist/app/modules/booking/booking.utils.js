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
exports.validateAvailabilityStrictForApproval =
  exports.calculateExtendBookingAmount =
  exports.calculateFirstTimeBookingAmount =
    void 0;
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const car_model_1 = require("../car/car.model");
const car_utils_1 = require("../car/car.utils");
const booking_interface_1 = require("./booking.interface");
const booking_model_1 = require("./booking.model");
const charges_model_1 = require("../charges/charges.model");
const calculateFirstTimeBookingAmount = (from, to, car) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const totalMs = to.getTime() - from.getTime();
    const totalHours = Math.ceil(totalMs / (1000 * 60 * 60)); // round up partial hour
    const dailyHours = 24;
    // Minimum 1 day
    const effectiveHours = totalHours < dailyHours ? dailyHours : totalHours;
    const fullDays = Math.floor(effectiveHours / dailyHours);
    let remainingHours = effectiveHours % dailyHours;
    let baseRentalPrice = fullDays * car.dailyPrice;
    // If remaining hours > 12, count it as 1 full day
    if (remainingHours > 0) {
      if (remainingHours > 12) {
        baseRentalPrice += car.dailyPrice;
      } else {
        baseRentalPrice += (car.dailyPrice / dailyHours) * remainingHours;
      }
    }
    // Get charges configuration
    const charges = yield charges_model_1.Charges.findOne();
    if (!charges) {
      throw new ApiErrors_1.default(404, "Charges configuration not found");
    }
    const normalize = (percent) => (percent > 1 ? percent / 100 : percent);
    const platformPercent = normalize(charges.platformFee);
    const hostPercent = normalize(charges.hostCommission);
    const adminPercent = normalize(charges.adminCommission);
    // Calculate fees based on rental price
    const platformFee = +(baseRentalPrice * platformPercent).toFixed(2);
    const hostCommission = +(baseRentalPrice * hostPercent).toFixed(2);
    const adminCommission = +(
      baseRentalPrice -
      platformFee -
      hostCommission
    ).toFixed(2);
    // Total amount = Rental Price + Platform Fee + Deposit
    const totalAmount =
      baseRentalPrice + platformFee + (car.depositAmount || 0);
    return {
      totalAmount: Number(totalAmount.toFixed(2)),
      baseRentalPrice: Number(baseRentalPrice.toFixed(2)),
      platformFee: Number(platformFee.toFixed(2)),
      hostCommission: Number(hostCommission.toFixed(2)),
      adminCommission: Number(adminCommission.toFixed(2)),
      depositAmount: car.depositAmount || 0,
    };
  });
exports.calculateFirstTimeBookingAmount = calculateFirstTimeBookingAmount;
const calculateExtendBookingAmount = (from, to, car) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!from || !to) {
      throw new Error("Invalid date provided");
    }
    const fromTime = new Date(from);
    const toTime = new Date(to);
    if (isNaN(fromTime.getTime()) || isNaN(toTime.getTime())) {
      throw new Error("Invalid date format");
    }
    const diffMs = toTime.getTime() - fromTime.getTime();
    if (diffMs <= 0) {
      throw new Error("Extend time must be after current booking end");
    }
    const totalHours = diffMs / (1000 * 60 * 60);
    if (!Number.isInteger(totalHours)) {
      throw new Error("Extend must be full hour slots");
    }
    if (
      !(car === null || car === void 0 ? void 0 : car.dailyPrice) ||
      isNaN(car.dailyPrice)
    ) {
      throw new Error("Invalid car daily price");
    }
    const hourlyRate = car.dailyPrice / 24;
    const baseExtendPrice = hourlyRate * totalHours;
    // Get charges configuration
    const charges = yield charges_model_1.Charges.findOne();
    if (!charges) {
      throw new ApiErrors_1.default(404, "Charges configuration not found");
    }
    const normalize = (percent) => (percent > 1 ? percent / 100 : percent);
    const platformPercent = normalize(charges.platformFee);
    const hostPercent = normalize(charges.hostCommission);
    const adminPercent = normalize(charges.adminCommission);
    // Calculate fees for extend
    const platformFee = +(baseExtendPrice * platformPercent).toFixed(2);
    const hostCommission = +(baseExtendPrice * hostPercent).toFixed(2);
    const adminCommission = +(
      baseExtendPrice -
      platformFee -
      hostCommission
    ).toFixed(2);
    const totalAmount = baseExtendPrice + platformFee;
    return {
      totalAmount: Number(totalAmount.toFixed(2)),
      baseExtendPrice: Number(baseExtendPrice.toFixed(2)),
      platformFee: Number(platformFee.toFixed(2)),
      hostCommission: Number(hostCommission.toFixed(2)),
      adminCommission: Number(adminCommission.toFixed(2)),
    };
  });
exports.calculateExtendBookingAmount = calculateExtendBookingAmount;
const validateAvailabilityStrictForApproval = (
  carId,
  from,
  to,
  ignoreBookingId,
) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (from >= to) {
      throw new ApiErrors_1.default(400, "Invalid booking time range");
    }
    const car = yield car_model_1.Car.findById(carId).select(
      "isActive availableDays availableHours defaultStartTime defaultEndTime blockedDates",
    );
    if (!car) throw new ApiErrors_1.default(404, "Car not found");
    if (!car.isActive) throw new ApiErrors_1.default(400, "Car is not active");
    const requestedSlots = (0, car_utils_1.generateRequestedHours)(from, to);
    const dateMap = requestedSlots.reduce((map, slot) => {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot.hour);
      return map;
    }, {});
    for (const [date, hours] of Object.entries(dateMap)) {
      //  blocked date
      const blocked =
        (_a = car.blockedDates) === null || _a === void 0
          ? void 0
          : _a.find(
              (b) => new Date(b.date).toISOString().split("T")[0] === date,
            );
      if (blocked) {
        throw new ApiErrors_1.default(400, `Car blocked on ${date}`);
      }
      // available day
      const dayName = new Date(date)
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();
      if (
        ((_b = car.availableDays) === null || _b === void 0
          ? void 0
          : _b.length) &&
        !car.availableDays.includes(dayName)
      ) {
        throw new ApiErrors_1.default(400, `Car not available on ${date}`);
      }
      //  open hours
      const openHours = new Set();
      if (
        (_c = car.availableHours) === null || _c === void 0 ? void 0 : _c.length
      ) {
        car.availableHours.forEach((t) =>
          openHours.add(parseInt(t.split(":")[0])),
        );
      } else if (car.defaultStartTime && car.defaultEndTime) {
        const s = parseInt(car.defaultStartTime);
        const e = parseInt(car.defaultEndTime);
        for (let h = s; h < e; h++) openHours.add(h);
      } else {
        for (let h = 0; h < 24; h++) openHours.add(h);
      }
      //  conflict bookings (excluding current)
      const bookings = yield booking_model_1.Booking.find({
        carId,
        _id: { $ne: ignoreBookingId },
        bookingStatus: {
          $in: [
            booking_interface_1.BOOKING_STATUS.CONFIRMED,
            booking_interface_1.BOOKING_STATUS.ONGOING,
          ],
        },
        fromDate: { $lt: to },
        toDate: { $gt: from },
      }).select("fromDate toDate");
      const bookedHours = new Set();
      bookings.forEach((b) => {
        const cursor = new Date(b.fromDate);
        while (cursor < b.toDate) {
          const local = (0, car_utils_1.getLocalDetails)(cursor);
          if (local.dateStr === date) bookedHours.add(local.hour);
          cursor.setTime(cursor.getTime() + 3600000);
        }
      });
      for (const hour of hours) {
        if (!openHours.has(hour)) {
          throw new ApiErrors_1.default(400, `Outside operating hours`);
        }
        if (bookedHours.has(hour)) {
          throw new ApiErrors_1.default(400, `Time already booked`);
        }
      }
    }
    return true;
  });
exports.validateAvailabilityStrictForApproval =
  validateAvailabilityStrictForApproval;
