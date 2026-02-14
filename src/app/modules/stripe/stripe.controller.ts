import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { User } from '../user/user.model';
import stripeService from './stripe.service';

const createStripeAccount = catchAsync(async (req, res) => {
    const user = req.user;

    const stripeAccount = await stripeService.createConnectedAccount(user.email);

    await User.findByIdAndUpdate(user.id, { stripeConnectedAccountId: stripeAccount.id });

    const returnUrl = 'https://yourapp.com/stripe/onboarding/success';
     const refreshUrl = 'https://yourapp.com/stripe/onboarding/refresh';

     const onboardingLink = await stripeService.createAccountLink(stripeAccount.id, returnUrl, refreshUrl);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Stripe account created successfully',
        data: onboardingLink,
    });
});

const getStripeDashboardLink = catchAsync(async (req, res) => {
    const user = req.user;

    if (!user.stripeAccountId) {
        return sendResponse(res, {
            success: false,
            statusCode: 400,
            message: 'Stripe account not connected',
        });
    }

    const dashboardLink = await stripeService.createLoginLink(user.stripeAccountId);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: 'Stripe Dashboard link generated',
        data: dashboardLink,
    });
});

export const StripeControllers = {
    createStripeAccount,
    getStripeDashboardLink,
};
