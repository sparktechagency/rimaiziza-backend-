// import { Types } from "mongoose";
// import { CAR_VERIFICATION_STATUS } from "./car.interface";
// import ApiError from "../../../errors/ApiErrors";
// import { User } from "../user/user.model";

// export const getCarTripCount = async (
//     carId: Types.ObjectId | string
// ): Promise<number> => {
//     const count = await Booking.countDocuments({
//         carId: new Types.ObjectId(carId),
//         carStatus: CAR_STATUS.COMPLETED,
//         isCancelled: { $ne: true },
//     });

//     return count;
// };

// // bulk car trip
// export const getCarTripCountMap = async (
//     carIds: Types.ObjectId[]
// ): Promise<Record<string, number>> => {
//     const result = await Booking.aggregate([
//         {
//             $match: {
//                 carId: { $in: carIds },
//                 carStatus: CAR_STATUS.COMPLETED,
//                 isCancelled: { $ne: true },
//             },
//         },
//         {
//             $group: {
//                 _id: "$carId",
//                 count: { $sum: 1 },
//             },
//         },
//     ]);

//     const map: Record<string, number> = {};
//     for (const item of result) {
//         map[item._id.toString()] = item.count;
//     }

//     return map;
// };


// // car.utils.ts
// export const checkCarAvailabilityByDate = async (car: any, targetDate: Date) => {



//     if (!car.isActive) return false;


//     const dayName = targetDate
//         .toLocaleDateString("en-US", { weekday: "long" })
//         .toUpperCase();
//     if (car.availableDays?.length && !car.availableDays.includes(dayName)) {
//         return false;
//     }


//     const dateString = targetDate.toISOString().split("T")[0];
//     const isBlocked = car.blockedDates?.some(
//         (b: any) => new Date(b.date).toISOString().split("T")[0] === dateString
//     );
//     if (isBlocked) return false;


//     const bookingConflict = await Booking.findOne({
//         carId: car._id,
//         status: { $in: ["PAID", "ONGOING"] },
//         fromDate: { $lte: targetDate },
//         toDate: { $gte: targetDate },
//     });

//     return !bookingConflict;
// };

// export const getCarCalendar = async (carId: string) => {
//     const calendar = [];
//     const today = new Date();

//     for (let i = 0; i < 30; i++) {
//         const targetDate = new Date(today);
//         targetDate.setDate(today.getDate() + i);
//         const dateString = targetDate.toISOString().split("T")[0];

//         // if any slot is available for that date
//         const availability = await CarServices.getAvailability(carId, dateString);


//         // if at least `1` slot is available
//         const isAnySlotAvailable = availability.slots.some(slot => slot.isAvailable === true);

//         calendar.push({
//             date: dateString,
//             available: isAnySlotAvailable,
//             reason: availability.blockedReason || (isAnySlotAvailable ? "" : "Fully Booked"),
//         });
//     }
//     return calendar;
// };

// export const normalizeCarVerificationStatus = (
//   status?: string
// ): CAR_VERIFICATION_STATUS | undefined => {
//   if (!status) return undefined;

//   const normalized = status.toUpperCase();

//   if (
//     !Object.values(CAR_VERIFICATION_STATUS).includes(
//       normalized as CAR_VERIFICATION_STATUS
//     )
//   ) {
//     throw new ApiError(
//       400,
//       `Invalid car verification status: ${status}`
//     );
//   }

//   return normalized as CAR_VERIFICATION_STATUS;
// };


// export const getTargetLocation = async (queryLat?: string | number, queryLng?: string | number, userId?: string) => {

//   let lat = queryLat ? Number(queryLat) : null;
//   let lng = queryLng ? Number(queryLng) : null;


//   if ((!lat || !lng) && userId) {
//     const user = await User.findById(userId).select("location");
//     if (user?.location?.coordinates) {
//       lng = user.location.coordinates[0];
//       lat = user.location.coordinates[1];
//     }
//   }

// // default dhaka
//   if (!lat || !lng) {
//     lng = 90.4125; 
//     lat = 21.8103;
//   }

//   return { lat, lng };
// };