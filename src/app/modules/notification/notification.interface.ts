import { Model, Types } from "mongoose";

export type INotification = {
  text: string;
  receiver?: Types.ObjectId;
  read: boolean;
  referenceId?: string;
  type?: string;
};

export type NotificationModel = Model<INotification>;
