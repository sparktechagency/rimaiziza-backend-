"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingRoutes = void 0;
const express_1 = __importDefault(require("express"));
const booking_controller_1 = require("./booking.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const fileUploaderHandler_1 = __importDefault(require("../../middlewares/fileUploaderHandler"));
const parseAllFileData_1 = __importDefault(require("../../middlewares/parseAllFileData"));
const router = express_1.default.Router();
router.route("/")
    .post((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, fileUploaderHandler_1.default)(), (0, parseAllFileData_1.default)({ fieldName: "nidFrontPic", forceSingle: true }, { fieldName: "nidBackPic", forceMultiple: true }, { fieldName: "drivingLicenseFrontPic", forceMultiple: true }, { fieldName: "drivingLicenseBackPic", forceMultiple: true }), booking_controller_1.BookingControllers.createBookingToDB);
router.route("/host")
    .get((0, auth_1.default)(user_1.USER_ROLES.HOST, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), booking_controller_1.BookingControllers.getHostBookings);
router.route("/host/:bookingId")
    .patch((0, auth_1.default)(user_1.USER_ROLES.HOST, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), booking_controller_1.BookingControllers.approveBookingByHost);
router.route("/cancel/:bookingId")
    .post((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), booking_controller_1.BookingControllers.cancelBooking);
router.route("/all")
    .get((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), booking_controller_1.BookingControllers.getAllBookings);
router.route("/user")
    .get((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), booking_controller_1.BookingControllers.getUserBookings);
// router.route("/user/:bookingId")
//     .patch(
//         auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
//         BookingControllers.confirmBookingAfterPayment,
//     );
exports.BookingRoutes = router;
