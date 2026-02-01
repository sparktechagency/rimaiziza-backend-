import config from '../../../config';
import { BookingServices } from './booking.service';
import cron from "node-cron";


if (config.start_cron === "true") {
    cron.schedule("* * * * *", async () => { // 1 min
        try {
            await BookingServices.bookingStatusCronJob();
            console.log("Booking status cron job ran successfully");
        } catch (err) {
            console.error("Booking cron job error:", err);
        }
    });
}