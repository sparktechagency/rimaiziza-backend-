import { JwtPayload } from "jsonwebtoken";
import { INotification } from "./notification.interface";
import { Notification } from "./notification.model";
import QueryBuilder from "../../builder/queryBuilder";
import { NOTIFICATION_TYPE } from "./notification.constant";

// get notifications
const getNotificationFromDB = async (
  user: JwtPayload,
): Promise<INotification> => {
  const result = await Notification.find({ receiver: user.id });

  const unreadCount = await Notification.countDocuments({
    receiver: user.id,
    read: false,
  });

  const data: any = {
    result,
    unreadCount,
  };

  return data;
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

// get notifications for admin
const adminNotificationFromDB = async (query: any) => {
  const baseQuery = Notification.find({ type: NOTIFICATION_TYPE.ADMIN });

  const unreadCount = await Notification.countDocuments({
    type: NOTIFICATION_TYPE.ADMIN,
    read: false,
  });

  const queryBuilder = new QueryBuilder(baseQuery, query).paginate();

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

export const NotificationService = {
  adminNotificationFromDB,
  getNotificationFromDB,
  readNotificationToDB,
  adminReadNotificationToDB,
};
