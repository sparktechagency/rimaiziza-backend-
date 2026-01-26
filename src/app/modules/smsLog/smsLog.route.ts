import express from "express";
import { smsCallback } from "./smsLog.controller";


const router = express.Router();

router.get("/afrik-sms/callback", smsCallback);
router.post("/afrik-sms/callback", smsCallback);

export const SmsLogRoutes = router;
