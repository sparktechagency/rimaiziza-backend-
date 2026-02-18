"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const transaction_controller_1 = require("./transaction.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const router = express_1.default.Router();
router.post("/create-payment-session/:bookingId", (0, auth_1.default)(user_1.USER_ROLES.USER), transaction_controller_1.TransactionControllers.createBookingPaymentSession);
router.post("/create-extend-payment-session/:bookingId", (0, auth_1.default)(user_1.USER_ROLES.USER), transaction_controller_1.TransactionControllers.createExtendBookingPaymentController);
exports.TransactionRoutes = router;
