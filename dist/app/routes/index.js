"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_routes_1 = require("../modules/user/user.routes");
const auth_routes_1 = require("../modules/auth/auth.routes");
const rule_route_1 = require("../modules/rule/rule.route");
const faq_route_1 = require("../modules/faq/faq.route");
const review_route_1 = require("../modules/review/review.route");
const favoriteCar_route_1 = require("../modules/favoriteCar/favoriteCar.route");
const chat_routes_1 = require("../modules/chat/chat.routes");
const message_routes_1 = require("../modules/message/message.routes");
const car_routes_1 = require("../modules/car/car.routes");
const media_route_1 = require("../modules/media/media.route");
const support_route_1 = require("../modules/support/support.route");
const analytics_route_1 = require("../modules/analytics/analytics.route");
const hostDashboard_route_1 = require("../modules/hostDashboard/hostDashboard.route");
const banner_route_1 = require("../modules/banner/banner.route");
const charges_route_1 = require("../modules/charges/charges.route");
const booking_route_1 = require("../modules/booking/booking.route");
const stripe_route_1 = require("../modules/stripe/stripe.route");
const transaction_route_1 = require("../modules/transaction/transaction.route");
const router = express_1.default.Router();
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
    route: user_routes_1.UserRoutes,
  },
  {
    path: "/auth",
    route: auth_routes_1.AuthRoutes,
  },
  {
    path: "/rules",
    route: rule_route_1.RuleRoutes,
  },
  {
    path: "/faqs",
    route: faq_route_1.FaqRoutes,
  },
  {
    path: "/reviews",
    route: review_route_1.ReviewRoutes,
  },
  {
    path: "/favorites",
    route: favoriteCar_route_1.FavoriteCarRoutes,
  },
  {
    path: "/chats",
    route: chat_routes_1.ChatRoutes,
  },
  {
    path: "/messages",
    route: message_routes_1.MessageRoutes,
  },
  {
    path: "/cars",
    route: car_routes_1.CarRoutes,
  },
  {
    path: "/medias",
    route: media_route_1.MediaRoutes,
  },
  {
    path: "/supports",
    route: support_route_1.SupportRoutes,
  },
  {
    path: "/analytics",
    route: analytics_route_1.AnalyticsRoutes,
  },
  {
    path: "/host-dashboard",
    route: hostDashboard_route_1.HostDashboardRoutes,
  },
  {
    path: "/banners",
    route: banner_route_1.BannerRoutes,
  },
  {
    path: "/charges",
    route: charges_route_1.ChargesRoutes,
  },
  {
    path: "/bookings",
    route: booking_route_1.BookingRoutes,
  },
  {
    path: "/stripe",
    route: stripe_route_1.StripeRoutes,
  },
  {
    path: "/transactions",
    route: transaction_route_1.TransactionRoutes,
  },
];
apiRoutes.forEach((route) => router.use(route.path, route.route));
exports.default = router;
