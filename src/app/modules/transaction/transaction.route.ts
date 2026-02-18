import express from "express";
import { TransactionControllers } from "./transaction.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";

const router = express.Router();

router.post("/create-payment-session/:bookingId",auth(USER_ROLES.USER) ,TransactionControllers.createBookingPaymentSession);

router.post("/create-extend-payment-session/:bookingId",auth(USER_ROLES.USER) ,TransactionControllers.createExtendBookingPaymentController);



export const TransactionRoutes = router;