import { PipelineStage } from "mongoose";
import { HOST_STATUS, STATUS, USER_ROLES } from "../../../enums/user";
import { CAR_VERIFICATION_STATUS } from "../car/car.interface";
import { Car } from "../car/car.model";
import { User } from "../user/user.model";
import { Booking } from "../booking/booking.model";
import Transaction from "../payment/transaction.model";

const statCountsFromDB = async () => {
  const [users, cars, bookings, revenue] = await Promise.all([
    User.countDocuments({
      verified: true,
      status: STATUS.ACTIVE,
      role: { $in: [USER_ROLES.HOST, USER_ROLES.USER] },
    }),
    Car.countDocuments({
      verificationStatus: CAR_VERIFICATION_STATUS.APPROVED,
    }),
    Booking.countDocuments({
      status: "paid",
      carStatus: "completed"
    }),

    Transaction.aggregate([
      {
        $match: {
          status: "succeeded", // optional but recommended
        },
      },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: "$commissionAmount" },
        },
      },
    ]),

  ]);

  return {
    users,
    cars,
    bookings,
    revenue: revenue[0].totalCommission || 0
  };
};

const getGuestHostYearlyChart = async (year?: number) => {
  const currentYear = new Date().getUTCFullYear();
  const targetYear = year || currentYear;

  const startDate = new Date(Date.UTC(targetYear, 0, 1));
  const endDate = new Date(Date.UTC(targetYear + 1, 0, 1));

  const pipeline: PipelineStage[] = [
    {
      $match: {
        createdAt: { $gte: startDate, $lt: endDate },
        $or: [
          {
            role: USER_ROLES.USER,
            hostStatus: HOST_STATUS.NONE,
          },
          {
            hostStatus: HOST_STATUS.APPROVED,
          },
        ],
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          role: "$role",
        },
        total: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.month",
        data: {
          $push: {
            role: "$_id.role",
            total: "$total",
          },
        },
      },
    },
    {
      $sort: { _id: 1 as 1 },
    },
  ];

  const raw = await User.aggregate(pipeline);

  const chart = Array.from({ length: 12 }).map((_, i) => {
    const month = i + 1;
    const row = raw.find((r) => r._id === month);

    return {
      month,
      guest:
        row?.data?.find((d: any) => d.role === USER_ROLES.USER)?.total || 0,
      host: row?.data?.find((d: any) => d.role === USER_ROLES.HOST)?.total || 0,
    };
  });

  return {
    year: targetYear,
    chart,
  };
};


export const AnalyticsServices = {
  statCountsFromDB,
  getGuestHostYearlyChart,
};
