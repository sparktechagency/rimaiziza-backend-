import { INotification } from "../app/modules/notification/notification.interface";
import { Notification } from "../app/modules/notification/notification.model";

export const sendNotifications = async (
  data: Partial<INotification>,
): Promise<INotification> => {
  const result = await (await Notification.create(data)).populate(
    "receiver sender referenceId",
  );

  //@ts-ignore
  const socketIo = global.io;

  if (socketIo) {
    socketIo.emit(`send-notification::${data?.receiver}`, result);
  }

  return result;
};
