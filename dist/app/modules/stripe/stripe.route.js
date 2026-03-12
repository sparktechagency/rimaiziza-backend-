"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const stripe_controller_1 = require("./stripe.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const router = express_1.default.Router();
router
    .route("/connect-account")
    .post((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST), stripe_controller_1.StripeControllers.createStripeAccount);
router.get("/dashboard", (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.HOST), stripe_controller_1.StripeControllers.getStripeDashboardLink);
exports.StripeRoutes = router;
