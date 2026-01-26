import { model, Schema } from "mongoose";
import { INotification, NotificationModel } from "./notification.interface";
import { NOTIFICATION_TYPE } from "./notification.constant";

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    text: {
      type: String,
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referenceId: {
      type: String,
      required: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Notification = model<INotification, NotificationModel>(
  "Notification",
  notificationSchema,
);
