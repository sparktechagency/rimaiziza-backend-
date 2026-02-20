import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { NotificationController } from "./notification.controller";
const router = express.Router();

router.route("/")
  .get(
    auth(USER_ROLES.USER,USER_ROLES.HOST),
    NotificationController.getNotificationFromDB,
  )
  .patch(
    auth(USER_ROLES.USER,USER_ROLES.HOST),
    NotificationController.readNotification,
  );
router.route("/admin")
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    NotificationController.adminNotificationFromDB,
  )
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    NotificationController.adminReadNotification,
  );


export const NotificationRoutes = router;
