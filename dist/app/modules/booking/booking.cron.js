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
const config_1 = __importDefault(require("../../../config"));
const handleStripeWebhook_1 = require("../../../helpers/webhooks/handleStripeWebhook");
const node_cron_1 = __importDefault(require("node-cron"));
if (config_1.default.start_cron === "true") {
    node_cron_1.default.schedule("* * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield (0, handleStripeWebhook_1.bookingStatusCronJob)();
            console.log("Booking status cron job ran successfully");
        }
        catch (err) {
            console.error("Booking cron job error:", err);
        }
    }));
}
