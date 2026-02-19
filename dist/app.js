"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_status_codes_1 = require("http-status-codes");
const morgan_1 = require("./shared/morgan");
const routes_1 = __importDefault(require("../src/app/routes"));
const globalErrorHandler_1 = __importDefault(
  require("./app/middlewares/globalErrorHandler"),
);
const path_1 = __importDefault(require("path"));
const v2_1 = __importDefault(require("./app/routes/v2"));
const handleStripeWebhook_1 = require("./helpers/webhooks/handleStripeWebhook");
const app = (0, express_1.default)();
app.set("view engine", "ejs");
app.set("views", path_1.default.join(__dirname, "views"));
app.post(
  "/stripe/webhook",
  express_1.default.raw({ type: "application/json" }),
  handleStripeWebhook_1.handleStripeWebhook,
);
// morgan
app.use(morgan_1.Morgan.successHandler);
app.use(morgan_1.Morgan.errorHandler);
//body parser
app.use(
  (0, cors_1.default)({
    origin: [
      "http://10.10.7.46:30011",
      "http://10.10.7.41:5003",
      "http://10.10.7.46:3014",
    ],
    credentials: true,
  }),
);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
//file retrieve
app.use(express_1.default.static("uploads"));
//router
app.use("/api/v1", routes_1.default);
routes_1.default.use("/api/v2", v2_1.default);
app.get("/", (req, res) => {
  res.send("Server is running...");
});
// handle not found route
app.use((req, res) => {
  res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
    success: false,
    message: "Not Found",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
});
//global error handle
app.use(globalErrorHandler_1.default);
exports.default = app;
