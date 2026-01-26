import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { User } from "../user/user.model";
import { stripeService } from "./stripeCEA.service";

const createStripeAccount = catchAsync(async (req, res) => {
  const user = req.user;

  const stripeAccount = await stripeService.createConnectedAccount(user.email);

  await User.findByIdAndUpdate(user.id, {
    connectedAccountId: stripeAccount.id,
    onboardingCompleted: false,
    payoutsEnabled: false,
  });

  const returnUrl = "https://yourapp.com/stripe/onboarding/success";
  const refreshUrl = "https://yourapp.com/stripe/onboarding/refresh";
  const onboardingLink = await stripeService.createAccountLink(
    stripeAccount.id,
    returnUrl,
    refreshUrl
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Stripe account created successfully",
    data: onboardingLink,
  });
});

export const StripeControllers = {
  createStripeAccount,
};
