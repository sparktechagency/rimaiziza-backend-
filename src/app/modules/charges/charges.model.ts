import { model, Schema } from 'mongoose';
import { TCharges } from './charges.interface';


export const chargesSchema = new Schema<TCharges>(
    {
        platformFee: {
            type: Number,
            required: true
        },
        hostCommission: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

export const Charges = model('Charges', chargesSchema);
