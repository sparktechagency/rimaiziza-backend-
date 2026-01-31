import { Types } from "mongoose";
import { User } from "../user/user.model";
import { ICar } from "./car.interface";
import { FavoriteCar } from "../favoriteCar/favoriteCar.model";
import { Booking } from "../booking/booking.model";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { CarServices } from "./car.service";

export const getTargetLocation = async (queryLat?: string | number, queryLng?: string | number, userId?: string) => {

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
  userId?: string
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

export const checkCarAvailabilityByDate = async (car: any, targetDate: Date) => {
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
    (b: any) => new Date(b.date).toISOString().split("T")[0] === dateString
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
        const isAnySlotAvailable = availability.slots.some(slot => slot.isAvailable === true);

        calendar.push({
            date: dateString,
            available: isAnySlotAvailable,
            reason: availability.blockedReason || (isAnySlotAvailable ? "" : "Fully Booked"),
        });
    }
    return calendar;
};