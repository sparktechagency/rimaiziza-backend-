import { JwtPayload } from "jsonwebtoken";
import { INotification } from "./notification.interface";
import { Notification } from "./notification.model";
import QueryBuilder from "../../builder/queryBuilder";
import { NOTIFICATION_TYPE } from "./notification.constant";

// get notifications
const getNotificationFromDB = async (
  user: JwtPayload,
  query: Record<string, unknown>,
) => {
  const baseQuery = Notification.find({ receiver: user.id }).populate(
    "receiver sender referenceId",
  );

  const unreadCount = await Notification.countDocuments({
    receiver: user.id,
    read: false,
  });

  const queryBuilder = new QueryBuilder(baseQuery, query).sort().paginate();

  const result = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  return {
    data: result,
    meta: {
      ...meta,
      unreadCount,
    },
  };
};

// read notifications only for user
const readNotificationToDB = async (
  user: JwtPayload,
): Promise<INotification | undefined> => {
  const result: any = await Notification.updateMany(
    { receiver: user.id, read: false },
    { $set: { read: true } },
  );
  return result;
};

// get recent activities (last 5)
const getRecentActivitiesFromDB = async (
  user: JwtPayload,
) => {
  const result = await Notification.find({ receiver: user.id })
    .populate("receiver sender referenceId")
    .sort({ createdAt: -1 })
    .limit(5);

  return result;
};

// get notifications for admin
const adminNotificationFromDB = async (query: any) => {
  const baseQuery = Notification.find({ type: NOTIFICATION_TYPE.ADMIN }).populate("receiver sender referenceId");

  const unreadCount = await Notification.countDocuments({
    type: NOTIFICATION_TYPE.ADMIN,
    read: false,
  });

  const queryBuilder = new QueryBuilder(baseQuery, query).sort().paginate();

  const result = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  return {
    data: result,
    meta: {
      ...meta,
      unreadCount,
    },
  };
};

// read notifications only for admin
const adminReadNotificationToDB = async (): Promise<INotification | null> => {
  const result: any = await Notification.updateMany(
    { type: NOTIFICATION_TYPE.ADMIN, read: false },
    { $set: { read: true } },
    { new: true },
  );
  return result;
};

// get recent activities for admin (last 5)
const adminRecentActivitiesFromDB = async () => {
  const result = await Notification.find({ type: NOTIFICATION_TYPE.ADMIN })
    .populate("receiver sender referenceId")
    .sort({ createdAt: -1 })
    .limit(5);

  return result;
};

export const NotificationService = {
  adminNotificationFromDB,
  getNotificationFromDB,
  readNotificationToDB,
  adminReadNotificationToDB,
  getRecentActivitiesFromDB,
  adminRecentActivitiesFromDB,
};
