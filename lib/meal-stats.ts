import { format, startOfDay, differenceInDays, addDays } from "date-fns";
import { Customer, MealLog } from "./db";

export function calculateMealStats(customer: Customer, allLogs: MealLog[]) {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayDate = startOfDay(new Date());
    const startDate = startOfDay(new Date(customer.startDate));

    const fullDaysPassedBeforeToday = Math.max(0, differenceInDays(todayDate, startDate));

    let expectedUntilYesterday = fullDaysPassedBeforeToday * 2;

    if (customer.startSlot === "slot2" && fullDaysPassedBeforeToday > 0) expectedUntilYesterday -= 1;

    const logsUntilYesterday = allLogs.filter((log) => log.logDate < todayStr);
    const eatenUntilYesterday = logsUntilYesterday.length;

    const pastSavedMeals = Math.max(0, expectedUntilYesterday - eatenUntilYesterday);

    const todaysLogs = allLogs.filter((log) => log.logDate === todayStr);
    const hasEatenSlot1 = todaysLogs.some((log) => log.slot === "slot1");
    const hasEatenSlot2 = todaysLogs.some((log) => log.slot === "slot2");

    const isLunchValidToday = customer.startSlot === "slot1" || fullDaysPassedBeforeToday > 0;
    const missedLunchToday = isLunchValidToday && !hasEatenSlot1 ? 1 : 0;

    const totalSkipsForDateExtension = pastSavedMeals + missedLunchToday;
    const extraFullDays = Math.floor(totalSkipsForDateExtension / 2);
    const dynamicEndDate = addDays(new Date(customer.endDate), extraFullDays);

    const totalEaten = allLogs.length;
    const totalDaysInContract = differenceInDays(new Date(customer.endDate), new Date(customer.startDate));

    const totalPlannedMeals = customer.startSlot === "slot2" ? totalDaysInContract * 2 + 1 : totalDaysInContract * 2;
    const mealsLeft = Math.max(0, totalPlannedMeals - totalEaten);
    const isOverEaten = totalEaten > totalPlannedMeals;

    const standardFinishSlot = customer.startSlot === "slot1" ? "slot2" : "slot1";
    const isSlotFlipped = totalSkipsForDateExtension % 2 !== 0;
    const finalFinishSlot = isSlotFlipped ? (standardFinishSlot === "slot1" ? "slot2" : "slot1") : standardFinishSlot;

    const daysLeft = differenceInDays(startOfDay(dynamicEndDate), todayDate);

    return {
        totalEaten,
        mealsLeft,
        daysLeft,
        dynamicEndDate,
        totalSkips: totalSkipsForDateExtension,
        extraFullDays,
        isExpired: daysLeft < 0 || (daysLeft === 0 && mealsLeft <= 0),
        isWarning: daysLeft >= 0 && daysLeft <= 3,
        isOverEaten,
        hasEatenSlot1,
        hasEatenSlot2,
        finishSlotLabel: finalFinishSlot === "slot1" ? "Lunch" : "Dinner",
        startSlotLabel: customer.startSlot === "slot1" ? "Lunch" : "Dinner",
    };
}
