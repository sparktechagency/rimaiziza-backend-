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
exports.TransactionControllers = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const transaction_service_1 = require("./transaction.service");
const createBookingPaymentSession = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const { bookingId } = req.params;
    console.log(bookingId, "BOOKING ID");
    const paymentUrl =
      yield transaction_service_1.TransactionServices.createBookingPaymentSession(
        bookingId,
        userId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "Payment session created successfully",
      data: paymentUrl,
    });
  }),
);
const createExtendBookingPaymentController = (0, catchAsync_1.default)(
  (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const { id: userId } = req.user;
      const { bookingId } = req.params;
      const { newToDate } = req.body;
      const sessionUrl =
        yield transaction_service_1.TransactionServices.createExtendBookingPaymentSession(
          bookingId,
          userId,
          new Date(newToDate),
        );
      (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Extend booking payment session created successfully",
        data: sessionUrl,
      });
    }),
);
const getTransactionsController = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const { status } = req.query;
    const transactions =
      yield transaction_service_1.TransactionServices.getTransactionsFromDB(
        userId,
        status,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Transactions fetched successfully",
      data: transactions,
    });
  }),
);
exports.TransactionControllers = {
  createBookingPaymentSession,
  createExtendBookingPaymentController,
  getTransactionsController,
};
