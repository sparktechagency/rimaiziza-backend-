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
exports.bookingStatusCronJob = exports.refundDepositIfEligible = exports.markBookingCompleted = exports.markBookingOngoing = exports.handleStripeWebhook = exports.handleCheckoutSessionCompleted = void 0;
const booking_interface_1 = require("../../app/modules/booking/booking.interface");
const booking_model_1 = require("../../app/modules/booking/booking.model");
const transaction_interface_1 = require("../../app/modules/transaction/transaction.interface");
const transaction_model_1 = require("../../app/modules/transaction/transaction.model");
const user_model_1 = require("../../app/modules/user/user.model");
const stripe_1 = __importDefault(require("../../config/stripe"));
/** -------------------------- STRIPE WEBHOOK HELPERS -------------------------- */
/** Handle checkout.session.completed → confirm booking */
const handleCheckoutSessionCompleted = (session) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = yield transaction_model_1.Transaction.findById(session.metadata.transactionId);
    if (!transaction)
        return;
    // Update transaction
    transaction.status = transaction_interface_1.TRANSACTION_STATUS.SUCCESS;
    transaction.stripePaymentIntentId = session.payment_intent;
    yield transaction.save();
    // Atomic booking update
    const booking = yield booking_model_1.Booking.findOneAndUpdate({ _id: transaction.bookingId, bookingStatus: booking_interface_1.BOOKING_STATUS.PENDING }, { bookingStatus: booking_interface_1.BOOKING_STATUS.CONFIRMED, transactionId: transaction._id }, { new: true });
    if (booking)
        console.log(`✅ Booking ${booking._id} confirmed`);
    else
        console.log(`⚠ Booking ${transaction.bookingId} already confirmed or invalid state`);
});
exports.handleCheckoutSessionCompleted = handleCheckoutSessionCompleted;
/** Handle host account.updated → mark onboarded */
const handleAccountUpdated = (account) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    console.log("Webhook received: account.updated");
    if (account.charges_enabled && ((_b = (_a = account.requirements) === null || _a === void 0 ? void 0 : _a.currently_due) === null || _b === void 0 ? void 0 : _b.length) === 0) {
        const host = yield user_model_1.User.findOneAndUpdate({ stripeConnectedAccountId: account.id, isStripeOnboarded: false }, { isStripeOnboarded: true }, { new: true });
        if (host)
            console.log(`✅ Host onboarded: ${host._id}`);
        else
            console.log("No host found to update or already onboarded");
    }
    else {
        console.log("Account not ready for onboarding:", {
            charges_enabled: account.charges_enabled,
            currently_due: (_c = account.requirements) === null || _c === void 0 ? void 0 : _c.currently_due,
        });
    }
});
/** Main Stripe webhook handler */
const handleStripeWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe_1.default.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
        switch (event.type) {
            case "checkout.session.completed":
                yield (0, exports.handleCheckoutSessionCompleted)(event.data.object);
                break;
            case "account.updated":
                yield handleAccountUpdated(event.data.object);
                break;
            default:
                console.log("Unhandled Stripe event type:", event.type);
        }
    }
    catch (err) {
        console.error("Error processing Stripe webhook:", err);
    }
    res.json({ received: true });
});
exports.handleStripeWebhook = handleStripeWebhook;
/** -------------------------- BOOKING STATUS HELPERS -------------------------- */
/** Move booking → ONGOING (Self / Confirmed) */
const markBookingOngoing = (bookingId) => __awaiter(void 0, void 0, void 0, function* () {
    const booking = yield booking_model_1.Booking.findById(bookingId);
    if (!booking)
        return;
    const now = new Date();
    if ((booking.bookingStatus === booking_interface_1.BOOKING_STATUS.CONFIRMED || booking.isSelfBooking) &&
        booking.fromDate <= now && booking.toDate > now &&
        !booking.isCanceledByUser && !booking.isCanceledByHost) {
        booking.bookingStatus = booking_interface_1.BOOKING_STATUS.ONGOING;
        booking.checkedInAt = now;
        yield booking.save();
        console.log(`Booking ${booking._id} marked as ONGOING`);
    }
});
exports.markBookingOngoing = markBookingOngoing;
/** Move booking → COMPLETED + schedule deposit refund + host commission payout */
const markBookingCompleted = (bookingId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const booking = yield booking_model_1.Booking.findById(bookingId)
        .populate("carId")
        .populate("transactionId")
        .populate("hostId");
    if (!booking)
        return;
    const now = new Date();
    if (booking.bookingStatus === booking_interface_1.BOOKING_STATUS.ONGOING && booking.toDate <= now) {
        booking.bookingStatus = booking_interface_1.BOOKING_STATUS.COMPLETED;
        booking.checkedOutAt = now;
        // Schedule deposit refund 3 days later
        booking.depositRefundableAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        booking.isDepositRefunded = false;
        yield booking.save();
        console.log(`Booking ${booking._id} marked COMPLETED, deposit refund scheduled`);
        // ------------------ HOST COMMISSION TRANSFER ------------------
        const transaction = booking.transactionId;
        const host = booking.hostId;
        if (transaction && (host === null || host === void 0 ? void 0 : host.stripeConnectedAccountId) && ((_a = transaction.charges) === null || _a === void 0 ? void 0 : _a.hostCommission)) {
            try {
                yield stripe_1.default.transfers.create({
                    amount: Math.round(transaction.charges.hostCommission * 100), // cents
                    currency: process.env.CURRENCY,
                    destination: host.stripeConnectedAccountId,
                    description: `Host commission for booking ${booking._id}`,
                    metadata: { bookingId: booking._id.toString(), transactionId: transaction._id.toString() },
                });
                console.log(`✅ Host commission transferred for booking ${booking._id}`);
            }
            catch (err) {
                console.error(`Failed to transfer host commission for booking ${booking._id}:`, err.message);
            }
        }
    }
});
exports.markBookingCompleted = markBookingCompleted;
/** Refund deposit if eligible (3 days after completion) */
const refundDepositIfEligible = (bookingId) => __awaiter(void 0, void 0, void 0, function* () {
    const booking = yield booking_model_1.Booking.findById(bookingId).populate("carId").populate("transactionId");
    if (!booking)
        return;
    const now = new Date();
    const car = booking.carId;
    const transaction = booking.transactionId;
    if (!car || !car.depositAmount || booking.isDepositRefunded)
        return;
    if (!transaction || !transaction.stripePaymentIntentId)
        return;
    if (!booking.depositRefundableAt || booking.depositRefundableAt > now)
        return;
    try {
        yield stripe_1.default.refunds.create({
            payment_intent: transaction.stripePaymentIntentId,
            amount: Math.round(car.depositAmount * 100), // Stripe expects cents
        });
        booking.isDepositRefunded = true;
        yield booking.save();
        console.log(`Deposit refunded for booking ${booking._id}`);
    }
    catch (err) {
        console.error(`Failed to refund deposit for booking ${booking._id}:`, err.message);
    }
});
exports.refundDepositIfEligible = refundDepositIfEligible;
/** -------------------------- CRON JOB / SCHEDULED TASK -------------------------- */
const bookingStatusCronJob = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    // 1️⃣ Self booking REQUESTED → ONGOING
    const requestedBookings = yield booking_model_1.Booking.find({
        bookingStatus: booking_interface_1.BOOKING_STATUS.REQUESTED,
        isSelfBooking: true,
        fromDate: { $lte: now },
        isCanceledByHost: { $ne: true },
        isCanceledByUser: { $ne: true },
    });
    for (const booking of requestedBookings) {
        try {
            yield (0, exports.markBookingOngoing)(booking._id.toString());
        }
        catch (err) {
            console.warn(`Cannot move self booking ${booking._id} to ONGOING:`, err.message);
        }
    }
    // 2️⃣ CONFIRMED → ONGOING
    const confirmedBookings = yield booking_model_1.Booking.find({
        bookingStatus: booking_interface_1.BOOKING_STATUS.CONFIRMED,
        fromDate: { $lte: now },
        isCanceledByHost: { $ne: true },
        isCanceledByUser: { $ne: true },
    });
    for (const booking of confirmedBookings) {
        try {
            yield (0, exports.markBookingOngoing)(booking._id.toString());
        }
        catch (err) {
            console.warn(`Cannot move booking ${booking._id} to ONGOING:`, err.message);
        }
    }
    // 3️⃣ ONGOING → COMPLETED + schedule deposit
    const ongoingBookings = yield booking_model_1.Booking.find({
        bookingStatus: booking_interface_1.BOOKING_STATUS.ONGOING,
        toDate: { $lte: now },
        isCanceledByHost: { $ne: true },
        isCanceledByUser: { $ne: true },
    });
    for (const booking of ongoingBookings) {
        try {
            yield (0, exports.markBookingCompleted)(booking._id.toString());
        }
        catch (err) {
            console.warn(`Cannot move booking ${booking._id} to COMPLETED:`, err.message);
        }
    }
    // 4️⃣ Deposit refund eligible
    const refundableBookings = yield booking_model_1.Booking.find({
        bookingStatus: booking_interface_1.BOOKING_STATUS.COMPLETED,
        depositRefundableAt: { $lte: now },
        isDepositRefunded: { $ne: true },
    });
    for (const booking of refundableBookings) {
        try {
            yield (0, exports.refundDepositIfEligible)(booking._id.toString());
        }
        catch (err) {
            console.warn(`Failed to refund deposit for booking ${booking._id}:`, err.message);
        }
    }
});
exports.bookingStatusCronJob = bookingStatusCronJob;
