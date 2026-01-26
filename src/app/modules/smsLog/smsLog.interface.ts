export interface ISMSLog extends Document {
  userId?: string;
  phone: string;
  countryCode: string;
  message: string;
  resourceId?: string;
  status?: "PENDING" | "DELIVERED" | "FAILED";
  providerCode?: string;
  providerMessage?: string;
}