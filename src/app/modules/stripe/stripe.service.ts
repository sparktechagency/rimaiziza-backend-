import Stripe from 'stripe';
import stripe from '../../../config/stripe';

class StripeService {
     // create a connected account for the vendor

     async createConnectedAccount(email: string): Promise<Stripe.Account> {
          const account = await stripe.accounts.create({
               type: 'express',
               //   country: 'US',
               email,
               capabilities: {
                    transfers: { requested: true },
                    card_payments: { requested: true },
               },
          });
          return account;
     }

     // generate the account onboarding link for the vendor
     async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
          const accountLink = await stripe.accountLinks.create({
               account: accountId,
               refresh_url: refreshUrl,
               return_url: returnUrl,
               type: 'account_onboarding',
          });
          return accountLink.url;
     }

     // Stripe Express Dashboard login link
     async createLoginLink(accountId: string): Promise<string> {
          const loginLink = await stripe.accounts.createLoginLink(accountId);
          return loginLink.url;
     }
}

export default new StripeService();
