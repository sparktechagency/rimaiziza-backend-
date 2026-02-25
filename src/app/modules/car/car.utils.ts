import { Types } from "mongoose";
import { User } from "../user/user.model";
import { AVAILABLE_DAYS, ICar } from "./car.interface";
import { FavoriteCar } from "../favoriteCar/favoriteCar.model";
import { Booking } from "../booking/booking.model";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { CarServices } from "./car.service";
import ApiError from "../../../errors/ApiErrors";
import { Car } from "./car.model";
import { USER_ROLES } from "../../../enums/user";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { TRANSACTION_STATUS } from "../transaction/transaction.interface";

export const getTargetLocation = async (
  queryLat?: string | number,
  queryLng?: string | number,
  userId?: string,
) => {
  let lat = queryLat ? Number(queryLat) : null;
  let lng = queryLng ? Number(queryLng) : null;

  if ((!lat || !lng) && userId) {
    const user = await User.findById(userId).select("location");
    if (user?.location?.coordinates) {
      lng = user.location.coordinates[0];
      lat = user.location.coordinates[1];
    }
  }

  // default dhaka
  if (!lat || !lng) {
    lng = 90.4125;
    lat = 21.8103;
  }

  return { lat, lng };
};

export const attachFavoriteToCar = async (
  car: ICar,
  userId?: string,
): Promise<ICar & { isFavorite: boolean }> => {
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return { ...car, isFavorite: false };
  }

  const favorite = await FavoriteCar.findOne({
    userId,
    referenceId: car._id,
  }).lean();

  return { ...car, isFavorite: !!favorite };
};

export const checkCarAvailabilityByDate = async (
  car: any,
  targetDate: Date,
) => {
  // Car inactive
  if (!car.isActive) return false;

  // Check availableDays
  const dayName = targetDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();

  if (car.availableDays?.length && !car.availableDays.includes(dayName)) {
    return false;
  }

  // Check blockedDates
  const dateString = targetDate.toISOString().split("T")[0];
  const isBlocked = car.blockedDates?.some(
    (b: any) => new Date(b.date).toISOString().split("T")[0] === dateString,
  );
  if (isBlocked) return false;

  // Check booking conflicts
  const bookingConflict = await Booking.findOne({
    carId: car._id,
    bookingStatus: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ONGOING] },
    fromDate: { $lte: targetDate },
    toDate: { $gte: targetDate },
  });

  return !bookingConflict;
};

export const getCarCalendar = async (carId: string) => {
  const calendar = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dateString = targetDate.toISOString().split("T")[0];

    // if any slot is available for that date
    const availability = await CarServices.getAvailability(carId, dateString);

    // if at least `1` slot is available
    const isAnySlotAvailable = availability.slots.some(
      (slot) => slot.isAvailable === true,
    );

    calendar.push({
      date: dateString,
      available: isAnySlotAvailable,
      reason:
        availability.blockedReason ||
        (isAnySlotAvailable ? "" : "Fully Booked"),
    });
  }
  return calendar;
};

export const getCarTripCount = async (
  carId: Types.ObjectId | string,
): Promise<number> => {
  const count = await Booking.countDocuments({
    carId: new Types.ObjectId(carId),
    bookingStatus: BOOKING_STATUS.COMPLETED,
    isCanceledByHost: { $ne: true },
    isCanceledByUser: { $ne: true },
  });

  return count;
};

// bulk car trip
export const getCarTripCountMap = async (
  carIds: Types.ObjectId[],
): Promise<Record<string, number>> => {
  const result = await Booking.aggregate([
    {
      $match: {
        carId: { $in: carIds },
        bookingStatus: BOOKING_STATUS.COMPLETED,
        isCanceledByHost: { $ne: true },
        isCanceledByUser: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$carId",
        count: { $sum: 1 },
      },
    },
  ]);

  const map: Record<string, number> = {};
  for (const item of result) {
    map[item._id.toString()] = item.count;
  }

  return map;
};

export const getLocalDetails = (date: Date) => {
  // Use System Local Time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return {
    dateStr: `${year}-${month}-${day}`,
    hour: date.getHours(),
    weekday: date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase(),
  };
};

interface RequestedHour {
  date: string; // YYYY-MM-DD
  hour: number; // 0-23 Local
}

export const generateRequestedHours = (
  from: Date,
  to: Date,
): RequestedHour[] => {
  const hours: RequestedHour[] = [];

  const cursor = new Date(from); // ensure Date object

  while (cursor.getTime() < to.getTime()) {
    // Push Local date and hour
    const local = getLocalDetails(cursor);
    hours.push({
      date: local.dateStr,
      hour: local.hour,
    });

    // Increment 1 hour
    cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
  }

  console.log(hours, "HOURS");

  return hours;
};

// Full strict availability check
export const validateAvailabilityStrict = async (
  carId: string,
  from: Date,
  to: Date,
) => {
  if (from >= to) throw new ApiError(400, "Invalid booking time range");

  // Fetch car
  const car = await Car.findById(carId).select(
    "isActive availableDays availableHours defaultStartTime defaultEndTime blockedDates",
  );

  console.log(car, "CAR");

  if (!car) throw new ApiError(404, "Car not found");
  if (!car.isActive) throw new ApiError(400, "Car is not active");

  const fromDate = from instanceof Date ? from : new Date(from);
  const toDate = to instanceof Date ? to : new Date(to);

  if (fromDate >= toDate) {
    throw new ApiError(400, "Invalid booking time range");
  }

  const requestedSlots = generateRequestedHours(fromDate, toDate);

  console.log(requestedSlots, "REQUESTED SLOTS");
  // Group slots by date
  const dateMap = requestedSlots.reduce(
    (map: Record<string, number[]>, slot) => {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot.hour);
      return map;
    },
    {},
  );

  console.log(dateMap, "DATE MAP");

  for (const [date, hours] of Object.entries(dateMap)) {
    // 1️⃣ Check blockedDates
    const blockedEntry = car.blockedDates?.find(
      (b: any) => new Date(b.date).toISOString().split("T")[0] === date,
    );
    if (blockedEntry) {
      throw new ApiError(
        400,
        `Car blocked on ${date}: ${blockedEntry.reason || "Blocked by host"}`,
      );
    }

    // 2️⃣ Check availableDays

    const dayName = new Date(date)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase() as AVAILABLE_DAYS;
    if (car.availableDays?.length && !car.availableDays.includes(dayName)) {
      throw new ApiError(400, `Car not available on ${date} (${dayName})`);
    }

    console.log(dayName, "DAY NAME");

    // 3️⃣ Build openHoursSet
    const openHoursSet = new Set<number>();
    if (car.availableHours?.length) {
      car.availableHours.forEach((t: string) => {
        const h = parseInt(t.split(":")[0], 10);
        if (!isNaN(h) && h >= 0 && h <= 23) openHoursSet.add(h);
      });
    } else if (car.defaultStartTime && car.defaultEndTime) {
      const start = parseInt(car.defaultStartTime.split(":")[0], 10);
      const end = parseInt(car.defaultEndTime.split(":")[0], 10) || 24;
      for (let h = start; h < end; h++) openHoursSet.add(h % 24);
    } else {
      for (let i = 0; i < 24; i++) openHoursSet.add(i);
    }

    // 4️⃣ Fetch conflicting bookings for this date
    // Widen search window to handle timezone overlaps
    // Parse "YYYY-MM-DD" to Local Start of Day
    const [y, m, d] = date.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d, 0, 0, 0, 0); // Local 00:00:00

    const dateStart = new Date(dateObj);
    dateStart.setDate(dateStart.getDate() - 1); // -1 day

    const dateEnd = new Date(dateObj);
    dateEnd.setDate(dateEnd.getDate() + 2); // +2 days

    const bookings = await Booking.find({
      carId: new Types.ObjectId(carId),
      bookingStatus: {
        $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ONGOING],
      },
      fromDate: { $lt: dateEnd },
      toDate: { $gt: dateStart },
    }).select("fromDate toDate");

    // Build booked hours (Local)
    const bookedHours = new Set<number>();
    bookings.forEach((b) => {
      const bStart = new Date(
        Math.max(b.fromDate.getTime(), dateStart.getTime()),
      );
      const bEnd = new Date(Math.min(b.toDate.getTime(), dateEnd.getTime()));
      const cursor = new Date(bStart);
      while (cursor < bEnd) {
        const local = getLocalDetails(cursor);
        // Only mark as booked if it matches the current checking date
        if (local.dateStr === date) {
          bookedHours.add(local.hour);
        }
        cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
      }
    });

    // 5️⃣ Validate requested hours
    for (const hour of hours) {
      if (!openHoursSet.has(hour)) {
        throw new ApiError(
          400,
          `Car not available on ${date} at ${String(hour).padStart(2, "0")}:00 (outside operating hours)`,
        );
      }
      if (bookedHours.has(hour)) {
        throw new ApiError(
          400,
          `Car already booked on ${date} at ${String(hour).padStart(2, "0")}:00`,
        );
      }
    }
  }

  return true; // all good
};

export const notifyAdminCarAction = async (
  action: "created" | "updated" | "deleted",
  carId: string,
) => {
  const admin = await User.findOne({
    role: USER_ROLES.SUPER_ADMIN,
  }).select("_id name");

  console.log(admin, "ADMIN");

  if (!admin) return;

  await sendNotifications({
    text: `Car ${action} successfully by admin (${admin.name || admin._id})`,
    receiver: admin._id.toString(),
    type: NOTIFICATION_TYPE.ADMIN,
    referenceId: carId,
  });
};

export const checkIfUserHasPaid = async (
  carId: string,
  userId: string,
): Promise<boolean> => {
  if (!userId || !Types.ObjectId.isValid(userId)) return false;
  if (!carId || !Types.ObjectId.isValid(carId)) return false;

  // Find any booking by this user for this car that has a successful payment
  const paidBooking = await Booking.findOne({
    carId: new Types.ObjectId(carId),
    userId: new Types.ObjectId(userId),
    bookingStatus: {
      $in: [
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.ONGOING,
        BOOKING_STATUS.COMPLETED,
      ],
    },
  })
    .select("_id transactionId isSelfBooking")
    .populate({
      path: "transactionId",
      select: "status",
    })
    .lean();


  if (!paidBooking) return false;

  // Self bookings don't have a transaction but are considered "paid" (confirmed by host)
  // Uncomment below if self bookings should also reveal host contact:
  // if ((paidBooking as any).isSelfBooking) return true;

  const transaction = paidBooking.transactionId as any;
  if (!transaction) return false;

  return transaction.status === TRANSACTION_STATUS.SUCCESS;
};