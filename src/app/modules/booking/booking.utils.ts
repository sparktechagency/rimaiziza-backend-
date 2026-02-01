export const calculateFirstTimeBookingAmount = (from: Date, to: Date, car: any) => {
    console.log(from, to, car, "---CAR---");

    const totalMs = to.getTime() - from.getTime();
    const totalHours = Math.ceil(totalMs / (1000 * 60 * 60)); // round up partial hour
    const dailyHours = 24;

    // Minimum 1 day
    const effectiveHours = totalHours < dailyHours ? dailyHours : totalHours;

    const fullDays = Math.floor(effectiveHours / dailyHours);
    let remainingHours = effectiveHours % dailyHours;

    let amount = fullDays * car.dailyPrice;

    // If remaining hours > 12, count it as 1 full day
    if (remainingHours > 0) {
        if (remainingHours > 12) {
            amount += car.dailyPrice;
        } else {
            amount += (car.dailyPrice / dailyHours) * remainingHours;
        }
    }

    // Add deposit
    amount += car.depositAmount || 0;

    console.log(amount, car, "Amount car");

    return amount;
};