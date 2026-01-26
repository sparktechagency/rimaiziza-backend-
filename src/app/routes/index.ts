import express from "express";
import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { RuleRoutes } from "../modules/rule/rule.route";
import { FaqRoutes } from "../modules/faq/faq.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { FavouriteCarRoutes } from "../modules/favouriteCar/favouriteCar.route";
import { ChatRoutes } from "../modules/chat/chat.routes";
import { MessageRoutes } from "../modules/message/message.routes";
import { CarRoutes } from "../modules/car/car.routes";
import { MediaRoutes } from "../modules/media/media.route";
import { SupportRoutes } from "../modules/support/support.route";
import { AnalyticsRoutes } from "../modules/analytics/analytics.route";
import { bookingRoutes } from "../modules/booking/booking.routes";
import { paymentRoutes } from "../modules/payment/payment.routes";
import { stripeCEARoutes } from "../modules/stripeCEA/stripeCEA.routes";
import { transactionRoutes } from "../modules/transaction/transaction.routes";
import { HostDashboardRoutes } from "../modules/hostDashboard/hostDashboard.route";
import { DestinationRoutes } from "../modules/destination/destination.route";
import { SmsLogRoutes } from "../modules/smsLog/smsLog.route";

const router = express.Router();

const apiRoutes = [
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/rules",
    route: RuleRoutes,
  },
  {
    path: "/faqs",
    route: FaqRoutes,
  },
  {
    path: "/reviews",
    route: ReviewRoutes,
  },
  {
    path: "/favourites",
    route: FavouriteCarRoutes,
  },
  {
    path: "/chats",
    route: ChatRoutes,
  },
  {
    path: "/messages",
    route: MessageRoutes,
  },
  {
    path: "/cars",
    route: CarRoutes,
  },
  {
    path: "/medias",
    route: MediaRoutes,
  },
  {
    path: "/supports",
    route: SupportRoutes,
  },

  {
    path: "/analytics",
    route: AnalyticsRoutes,
  },
  {
    path: "/bookings",
    route: bookingRoutes,
  },
  {
    path: "/payments",
    route: paymentRoutes,
  },
  {
    path: "/stripe-accounts",
    route: stripeCEARoutes,
  },
  {
    path: "/transactions",
    route: transactionRoutes
  },
  {
    path: "/host-dashboard",
    route: HostDashboardRoutes,
  },
  {
    path: "/destinations",
    route: DestinationRoutes,
  },
  {
    path: "/sms-logs",
    route: SmsLogRoutes,
  },  
];

apiRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
