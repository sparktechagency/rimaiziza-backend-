import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  ip_address: process.env.IP,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  node_env: process.env.NODE_ENV,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  redis_host: process.env.REDIS_HOST,
  redis_port: process.env.REDIS_PORT,
  redis_password: process.env.REDIS_PASSWORD,
  redis_db: process.env.REDIS_DB,
  start_cron: process.env.START_CRON,
  client_url: process.env.CLIENT_URL,

  // cinetpay: {
  //   CINATPAY_SITE_ID: process.env.CINATPAY_SITE_ID!,
  //   CINATPAY_API_KEY: process.env.CINATPAY_API_KEY!,
  //   CINATPAY_SECRET_KEY: process.env.CINATPAY_SECRET_KEY!,
  //   BASE_URL: process.env.BASE_URL!,
  // },

  stripe: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    paymentSuccess: process.env.STRIPE_PAYMENT_SUCCESS!,
    BASE_URL: process.env.BASE_URL!,
    currency: process.env.CURRENCY!,
  },
  email: {
    from: process.env.EMAIL_FROM,
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,
  },
  support_receiver_email: process.env.SUPPORT_RECEIVER_EMAIL,
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  afrikSms: {
    clientId: process.env.AFRIKSMS_CLIENT_ID,
    apiKey: process.env.AFRIKSMS_API_KEY,
    senderId: process.env.AFRIKSMS_SENDER_ID || "AFRIKSMS",
    callbackUrl: process.env.AFRIKSMS_CALLBACK_URL,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    serviceSid: process.env.TWILIO_SERVICE_SID,
  },
};
