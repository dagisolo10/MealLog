"use client";
import { format, startOfDay, differenceInDays, addDays, isAfter, setHours } from "date-fns";
import { Contract, MealLog } from "./db";

export function calculateMealStats(activeContract: Contract | undefined, allLogs: MealLog[]) {
    const isHalf = activeContract?.half ?? false;
    const MEALS_PER_DAY = isHalf ? 1 : 2;
    const TOTAL_MEALS_QUOTA = isHalf ? 30 : 60;
    const TOTAL_COST = isHalf ? 2500 : 5000;

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

    const fullDaysPassedBeforeToday = Math.max(0, differenceInDays(todayDate, startDate));
    let expectedUntilYesterday = fullDaysPassedBeforeToday * MEALS_PER_DAY;

    if (!isHalf && activeContract.startSlot === "slot2") {
        expectedUntilYesterday -= 1;
    }

    const contractLogs = allLogs.filter((log) => log.contractId === activeContract.id);
    const eatenUntilYesterday = contractLogs.filter((log) => log.logDate < todayStr).length;
    const pastSavedMeals = Math.max(0, expectedUntilYesterday - eatenUntilYesterday);

    const todaysLogs = contractLogs.filter((log) => log.logDate === todayStr);
    const hasEatenSlot1 = todaysLogs.some((log) => log.slot === "slot1");
    const hasEatenSlot2 = todaysLogs.some((log) => log.slot === "slot2");

    const isPastLunchTime = isAfter(now, setHours(todayDate, 15));
    const isLunchValidToday = isHalf ? true : activeContract.startSlot === "slot1" || fullDaysPassedBeforeToday > 0;

    const missedLunchToday = !isHalf && isLunchValidToday && !(hasEatenSlot1 || hasEatenSlot2) && isPastLunchTime ? 1 : 0;

    const totalSkips = pastSavedMeals + missedLunchToday;

    let dynamicEndDate: Date;
    let finalFinishSlotLabel = "";

    if (isHalf) {
        dynamicEndDate = addDays(startDate, TOTAL_MEALS_QUOTA - 1 + totalSkips);
        finalFinishSlotLabel = activeContract.startSlot === "slot1" ? "ቁርስ/ምሳ" : "እራት";
    } else {
        const startOffset = activeContract.startSlot === "slot1" ? 0 : 1;
        const finalSlotIndex = startOffset + (TOTAL_MEALS_QUOTA + totalSkips) - 1;

        dynamicEndDate = addDays(startDate, Math.floor(finalSlotIndex / 2));
        finalFinishSlotLabel = finalSlotIndex % 2 !== 0 ? "እራት" : "ቁርስ/ምሳ";
    }

    const totalEaten = contractLogs.length;
    const mealsLeft = Math.max(0, TOTAL_MEALS_QUOTA - totalEaten);
    const daysLeft = differenceInDays(startOfDay(dynamicEndDate), todayDate);

    return {
        debt: activeContract.debt || 0,
        remainingAmount: Math.max(0, TOTAL_COST - activeContract.paidAmount),
        totalEaten,
        mealsLeft,
        daysLeft,
        dynamicEndDate,
        totalSkips,
        extraFullDays: Math.floor(totalSkips / MEALS_PER_DAY),
        isExpired: daysLeft < 0 || (daysLeft === 0 && mealsLeft <= 0),
        isWarning: daysLeft >= 0 && daysLeft <= 3,
        isOverEaten: totalEaten > TOTAL_MEALS_QUOTA,
        hasEatenSlot1,
        hasEatenSlot2,
        statusColor: daysLeft < 0 ? "text-red-500" : daysLeft <= 3 ? "text-orange-500" : "text-green-500",
        paymentStatusColor: activeContract.paidAmount >= TOTAL_COST ? "text-green-600" : "text-red-600",
        finishSlotLabel: finalFinishSlotLabel,
        startSlotLabel: activeContract.startSlot === "slot1" ? "ቁርስ/ምሳ" : "እራት",
    };
}
