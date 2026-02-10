import express from "express";
import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { RuleRoutes } from "../modules/rule/rule.route";
import { FaqRoutes } from "../modules/faq/faq.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { FavoriteCarRoutes } from "../modules/favoriteCar/favoriteCar.route";
import { ChatRoutes } from "../modules/chat/chat.routes";
import { MessageRoutes } from "../modules/message/message.routes";
import { CarRoutes } from "../modules/car/car.routes";
import { MediaRoutes } from "../modules/media/media.route";
import { SupportRoutes } from "../modules/support/support.route";
import { AnalyticsRoutes } from "../modules/analytics/analytics.route";
import { HostDashboardRoutes } from "../modules/hostDashboard/hostDashboard.route";
import { BannerRoutes } from "../modules/banner/banner.route";
import { ChargesRoutes } from "../modules/charges/charges.route";
import { BookingRoutes } from "../modules/booking/booking.route";

const router = express.Router();

// {
//   "arrayAction": {
//     "field": "assignedHosts",
//     "action": "DELETE",
//     "value": "64e123abcd4567890f123456"
//   }
// }


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
    path: "/favorites",
    route: FavoriteCarRoutes,
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
    path: "/host-dashboard",
    route: HostDashboardRoutes,
  },
  {
    path: "/banners",
    route: BannerRoutes,
  },
  {
    path: "/charges",
    route: ChargesRoutes,
  },
  {
    path: "/bookings",
    route: BookingRoutes,
  }
];

apiRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
