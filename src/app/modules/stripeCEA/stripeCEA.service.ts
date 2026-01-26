import Stripe from "stripe";
import stripe from "../../../config/stripe";

class StripeService {
  async createConnectedAccount(email: string): Promise<Stripe.Account> {
    return stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
  }

  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<string> {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return link.url;
  }

  async createLoginLink(accountId: string): Promise<string> {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  }
}

export const stripeService = new StripeService();
