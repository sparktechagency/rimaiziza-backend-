import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    carId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Car ID"),
    fromDate: z.string().datetime({ message: "Invalid fromDate format" }),
    toDate: z.string().datetime({ message: "Invalid toDate format" }),
    type: z.enum(['withDriver', 'withoutDriver'])
  })
  //  toDate > fromDate
  .refine((data) => new Date(data.toDate) > new Date(data.fromDate), {
    message: "toDate must be after fromDate",
    path: ["toDate"]
  })
  //  fromDate >= current exact time
  .refine((data) => new Date(data.fromDate).getTime() >= Date.now(), {
    message: "fromDate cannot be in the past",
    path: ["fromDate"]
  }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

