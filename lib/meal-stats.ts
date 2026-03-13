"use client";
import { format, startOfDay, differenceInDays, addDays, isAfter, setHours } from "date-fns";
import { Contract, MealLog } from "./db";

export function calculateMealStats(activeContract: Contract | undefined, allLogs: MealLog[]) {
    const TOTAL_MEALS_QUOTA = 60;
    const TOTAL_COST = 5000;

    if (!activeContract) {
        return {
            totalEaten: 0,
            mealsLeft: 0,
            daysLeft: 0,
            dynamicEndDate: new Date(),
            totalSkips: 0,
            extraFullDays: 0,
            isExpired: true,
            isWarning: false,
            isOverEaten: false,
            hasEatenSlot1: false,
            hasEatenSlot2: false,
            statusColor: "text-red-500",
            paymentStatusColor: "text-red-600",
            finishSlotLabel: "N/A",
            startSlotLabel: "N/A",
        };
    }

    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const todayDate = startOfDay(now);
    const startDate = startOfDay(new Date(activeContract.startDate));
    const originalEndDate = new Date(activeContract.endDate);

    const fullDaysPassedBeforeToday = Math.max(0, differenceInDays(todayDate, startDate));
    let expectedUntilYesterday = fullDaysPassedBeforeToday * 2;

    if (activeContract.startSlot === "slot2" && fullDaysPassedBeforeToday > 0) expectedUntilYesterday -= 1;

    const contractLogs = allLogs.filter((log) => log.contractId === activeContract.id);
    const logsUntilYesterday = contractLogs.filter((log) => log.logDate < todayStr);
    const eatenUntilYesterday = logsUntilYesterday.length;

    const pastSavedMeals = Math.max(0, expectedUntilYesterday - eatenUntilYesterday);

    const todaysLogs = contractLogs.filter((log) => log.logDate === todayStr);
    const hasEatenSlot1 = todaysLogs.some((log) => log.slot === "slot1");
    const hasEatenSlot2 = todaysLogs.some((log) => log.slot === "slot2");

    const LUNCH_END_TIME = setHours(todayDate, 15);
    const isPastLunchTime = isAfter(now, LUNCH_END_TIME);

    const isLunchValidToday = activeContract.startSlot === "slot1" || fullDaysPassedBeforeToday > 0;

    const missedLunchToday = isLunchValidToday && !hasEatenSlot1 && (hasEatenSlot2 || isPastLunchTime) ? 1 : 0;

    const totalSkipsForDateExtension = pastSavedMeals + missedLunchToday;
    const extraFullDays = Math.floor(totalSkipsForDateExtension / 2);

    const dynamicEndDate = addDays(originalEndDate, extraFullDays);
    const totalEaten = contractLogs.length;
    const mealsLeft = Math.max(0, TOTAL_MEALS_QUOTA - totalEaten);
    const isOverEaten = totalEaten > TOTAL_MEALS_QUOTA;

    const standardFinishSlot = activeContract.startSlot === "slot1" ? "slot2" : "slot1";
    const isSlotFlipped = totalSkipsForDateExtension % 2 !== 0;
    const finalFinishSlot = isSlotFlipped ? (standardFinishSlot === "slot1" ? "slot2" : "slot1") : standardFinishSlot;

    const daysLeft = differenceInDays(startOfDay(dynamicEndDate), todayDate);

    let statusColor = "text-green-500";
    if (daysLeft < 0 || (daysLeft === 0 && mealsLeft <= 0)) statusColor = "text-red-500";
    else if (daysLeft >= 0 && daysLeft <= 3) statusColor = "text-orange-500";

    const remainingAmount = 5000 - activeContract.paidAmount;

    const debt = activeContract.debt || 0;

    return {
        debt,
        remainingAmount,
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
        statusColor,
        paymentStatusColor: activeContract.paidAmount >= TOTAL_COST ? "text-green-600" : "text-red-600",
        finishSlotLabel: finalFinishSlot === "slot1" ? "ቁርስ/ምሳ" : "እራት",
        startSlotLabel: activeContract.startSlot === "slot1" ? "ቁርስ/ምሳ" : "እራት",
    };
}
