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
exports.StripeControllers = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const user_model_1 = require("../user/user.model");
const stripe_service_1 = __importDefault(require("./stripe.service"));
const createStripeAccount = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const stripeAccount = yield stripe_service_1.default.createConnectedAccount(user.email);
    yield user_model_1.User.findByIdAndUpdate(user.id, {
        stripeConnectedAccountId: stripeAccount.id,
    });
    const returnUrl = "https://yourapp.com/stripe/onboarding/success";
    const refreshUrl = "https://yourapp.com/stripe/onboarding/refresh";
    const onboardingLink = yield stripe_service_1.default.createAccountLink(stripeAccount.id, returnUrl, refreshUrl);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Stripe account created successfully",
        data: onboardingLink,
    });
}));
const getStripeDashboardLink = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    if (!user.stripeAccountId) {
        return (0, sendResponse_1.default)(res, {
            success: false,
            statusCode: 400,
            message: "Stripe account not connected",
        });
    }
    const dashboardLink = yield stripe_service_1.default.createLoginLink(user.stripeAccountId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Stripe Dashboard link generated",
        data: dashboardLink,
    });
}));
exports.StripeControllers = {
    createStripeAccount,
    getStripeDashboardLink,
};
