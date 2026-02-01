import ApiError from "../../../errors/ApiErrors";
import { AVAILABLE_DAYS } from "../car/car.interface";
import { Car } from "../car/car.model";
import { generateRequestedHours, getLocalDetails } from "../car/car.utils";
import { BOOKING_STATUS } from "./booking.interface";
import { Booking } from "./booking.model";

export const calculateFirstTimeBookingAmount = (from: Date, to: Date, car: any) => {
    console.log(from, to, car, "---CAR---");

    const totalMs = to.getTime() - from.getTime();
    const totalHours = Math.ceil(totalMs / (1000 * 60 * 60)); // round up partial hour
    const dailyHours = 24;

    // Minimum 1 day
    const effectiveHours = totalHours < dailyHours ? dailyHours : totalHours;

    const fullDays = Math.floor(effectiveHours / dailyHours);
    let remainingHours = effectiveHours % dailyHours;

    let amount = fullDays * car.dailyPrice;

    // If remaining hours > 12, count it as 1 full day
    if (remainingHours > 0) {
        if (remainingHours > 12) {
            amount += car.dailyPrice;
        } else {
            amount += (car.dailyPrice / dailyHours) * remainingHours;
        }
    }

    // Add deposit
    amount += car.depositAmount || 0;

    console.log(amount, car, "Amount car");

    return amount;
};

export const validateAvailabilityStrictForApproval = async (
    carId: string,
    from: Date,
    to: Date,
    ignoreBookingId: string
) => {
    if (from >= to) {
        throw new ApiError(400, "Invalid booking time range");
    }

    const car = await Car.findById(carId).select(
        "isActive availableDays availableHours defaultStartTime defaultEndTime blockedDates"
    );

    if (!car) throw new ApiError(404, "Car not found");
    if (!car.isActive) throw new ApiError(400, "Car is not active");

    const requestedSlots = generateRequestedHours(from, to);

    const dateMap = requestedSlots.reduce((map: Record<string, number[]>, slot) => {
        if (!map[slot.date]) map[slot.date] = [];
        map[slot.date].push(slot.hour);
        return map;
    }, {});

    for (const [date, hours] of Object.entries(dateMap)) {
        //  blocked date
        const blocked = car.blockedDates?.find(
            (b: any) => new Date(b.date).toISOString().split("T")[0] === date
        );
        if (blocked) {
            throw new ApiError(400, `Car blocked on ${date}`);
        }

        // available day
        const dayName = new Date(date)
            .toLocaleDateString("en-US", { weekday: "long" })
            .toUpperCase() as AVAILABLE_DAYS;

        if (car.availableDays?.length && !car.availableDays.includes(dayName)) {
            throw new ApiError(400, `Car not available on ${date}`);
        }

        //  open hours
        const openHours = new Set<number>();
        if (car.availableHours?.length) {
            car.availableHours.forEach(t => openHours.add(parseInt(t.split(":")[0])));
        } else if (car.defaultStartTime && car.defaultEndTime) {
            const s = parseInt(car.defaultStartTime);
            const e = parseInt(car.defaultEndTime);
            for (let h = s; h < e; h++) openHours.add(h);
        } else {
            for (let h = 0; h < 24; h++) openHours.add(h);
        }

        //  conflict bookings (excluding current)
        const bookings = await Booking.find({
            carId,
            _id: { $ne: ignoreBookingId },
            bookingStatus: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ONGOING] },
            fromDate: { $lt: to },
            toDate: { $gt: from },
        }).select("fromDate toDate");

        const bookedHours = new Set<number>();
        bookings.forEach(b => {
            const cursor = new Date(b.fromDate);
            while (cursor < b.toDate) {
                const local = getLocalDetails(cursor);
                if (local.dateStr === date) bookedHours.add(local.hour);
                cursor.setTime(cursor.getTime() + 3600000);
            }
        });

        for (const hour of hours) {
            if (!openHours.has(hour)) {
                throw new ApiError(400, `Outside operating hours`);
            }
            if (bookedHours.has(hour)) {
                throw new ApiError(400, `Time already booked`);
            }
        }
    }

    return true;
};