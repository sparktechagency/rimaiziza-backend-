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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBookingId = exports.generateVehicleId = exports.generateMembershipId = void 0;
const user_model_1 = require("../app/modules/user/user.model");
const user_1 = require("../enums/user");
const car_model_1 = require("../app/modules/car/car.model");
const booking_model_1 = require("../app/modules/booking/booking.model");
// Find the last created host's membershipId
const findLastMembershipId = () => __awaiter(void 0, void 0, void 0, function* () {
    const lastHost = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.HOST }, // host role
    { membershipId: 1, _id: 0 })
        .sort({ createdAt: -1 })
        .lean();
    return (lastHost === null || lastHost === void 0 ? void 0 : lastHost.membershipId) || null;
});
// Generate new membership ID
// Format: MEM-2026-0001
const generateMembershipId = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentYear = new Date().getUTCFullYear().toString();
    let currentId = (0).toString().padStart(4, '0'); // default 0000
    const lastMembershipId = yield findLastMembershipId();
    if (lastMembershipId) {
        // lastMembershipId = "MEM-2026-0001"
        const lastYear = lastMembershipId.split('-')[1]; // 2026
        const lastNumber = lastMembershipId.split('-')[2]; // 0001
        if (lastYear === currentYear) {
            currentId = (parseInt(lastNumber) + 1).toString().padStart(4, '0');
        }
    }
    return `MEM-${currentYear}-${currentId}`;
});
exports.generateMembershipId = generateMembershipId;
// Find the last created car's vehicleId
const findLastVehicleId = () => __awaiter(void 0, void 0, void 0, function* () {
    const lastCar = yield car_model_1.Car.findOne({}, // all cars
    { vehicleId: 1, _id: 0 })
        .sort({ createdAt: -1 })
        .lean();
    return (lastCar === null || lastCar === void 0 ? void 0 : lastCar.vehicleId) || null;
});
// Generate new vehicle ID
// Format: VEH-2026-0001
const generateVehicleId = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentYear = new Date().getUTCFullYear().toString();
    let currentId = (0).toString().padStart(4, '0'); // default 0000
    const lastVehicleId = yield findLastVehicleId();
    if (lastVehicleId) {
        // lastVehicleId = "VEH-2026-0001"
        const lastYear = lastVehicleId.split('-')[1]; // 2026
        const lastNumber = lastVehicleId.split('-')[2]; // 0001
        if (lastYear === currentYear) {
            currentId = (parseInt(lastNumber) + 1).toString().padStart(4, '0');
        }
    }
    return `VEH-${currentYear}-${currentId}`;
});
exports.generateVehicleId = generateVehicleId;
// Find the last created booking's bookingId
const findLastBookingId = () => __awaiter(void 0, void 0, void 0, function* () {
    const lastBooking = yield booking_model_1.Booking.findOne({}, { bookingId: 1, _id: 0 })
        .sort({ createdAt: -1 })
        .lean();
    return (lastBooking === null || lastBooking === void 0 ? void 0 : lastBooking.bookingId) || null;
});
// Generate new booking ID
// Format: BKG-2026-0001
const generateBookingId = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentYear = new Date().getUTCFullYear().toString();
    let currentId = '0000'; // default
    const lastBookingId = yield findLastBookingId();
    if (lastBookingId) {
        // lastBookingId = "BKG-2026-0001"
        const [, lastYear, lastNumber] = lastBookingId.split('-');
        if (lastYear === currentYear) {
            currentId = (Number(lastNumber) + 1)
                .toString()
                .padStart(4, '0');
        }
    }
    return `BKG-${currentYear}-${currentId}`;
});
exports.generateBookingId = generateBookingId;
