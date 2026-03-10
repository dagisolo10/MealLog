import ExcelJS from "exceljs";
import { Customer, MealLog, db } from "@/lib/db";
import { monthNames, toGC, toEC } from "kenat";
import { getFullDate } from "@/lib/helper-functions";
import { calculateMealStats } from "./meal-stats";

export const exportFullHistory = async (customers: Customer[], allLogs: MealLog[]) => {
    if (customers.length === 0) return;

    const allContracts = await db.contracts.toArray();
    const workbook = new ExcelJS.Workbook();

    const allDates = allLogs.map((l) => new Date(l.logDate));
    if (allDates.length === 0) allDates.push(new Date());

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const minEth = toEC(minDate.getFullYear(), minDate.getMonth() + 1, minDate.getDate());
    const maxEth = toEC(maxDate.getFullYear(), maxDate.getMonth() + 1, maxDate.getDate());

    const logPeriods: string[] = [];
    let currYear = minEth.year;
    let currMonth = minEth.month;

    while (currYear < maxEth.year || (currYear === maxEth.year && currMonth <= maxEth.month)) {
        logPeriods.push(`${currYear}-${currMonth}`);
        currMonth++;
        if (currMonth > 13) {
            currMonth = 1;
            currYear++;
        }
    }

    for (const period of logPeriods) {
        const [year, monthNum] = period.split("-").map(Number);
        const monthName = monthNames.english[monthNum - 1];

        const daysInThisMonth = monthNum === 13 ? ((year + 1) % 4 === 0 ? 6 : 5) : 30;

        const worksheet = workbook.addWorksheet(`${monthName} ${year}`);

        worksheet.columns = [
            { header: "ስም (Name)", key: "name", width: 25 },
            { header: "ማብቂያ (End Date)", key: "endDate", width: 18 },
            ...Array.from({ length: daysInThisMonth }, (_, i) => ({
                header: (i + 1).toString(),
                key: `day${i + 1}`,
                width: 6,
            })),
            { header: "ቁርስ/ምሳ", key: "s1Total", width: 10 },
            { header: "እራት", key: "s2Total", width: 10 },
            { header: "ጠቅላላ", key: "grandTotal", width: 12 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
        headerRow.alignment = { horizontal: "center" };

        customers.forEach((customer) => {
            const customerLogs = allLogs.filter((log) => log.customerId === customer.id);
            const activeContract = allContracts.find((c) => c.customerId === customer.id && c.status === "active");

            const stats = calculateMealStats(activeContract, customerLogs);

            const rowData: Record<string, string> = {
                name: customer.name,
                endDate: activeContract ? `${getFullDate(stats.dynamicEndDate.toISOString())}` : "No Active Contract",
            };

            let s1Count = 0;
            let s2Count = 0;
            let hasActivity = false;

            for (let d = 1; d <= daysInThisMonth; d++) {
                const gc = toGC(year, monthNum, d);
                const logDate = `${gc.year}-${gc.month.toString().padStart(2, "0")}-${gc.day.toString().padStart(2, "0")}`;

                const s1 = allLogs.find((l) => l.customerId === customer.id && l.logDate === logDate && l.slot === "slot1");
                const s2 = allLogs.find((l) => l.customerId === customer.id && l.logDate === logDate && l.slot === "slot2");

                if (s1 || s2) {
                    hasActivity = true;
                    if (s1) s1Count++;
                    if (s2) s2Count++;

                    rowData[`day${d}`] = s1 && s2 ? "✓ ✓" : s1 ? "✓ ✕" : "✕ ✓";
                } else {
                    rowData[`day${d}`] = "-";
                }
            }

            if (hasActivity || activeContract) {
                rowData.s1Total = String(s1Count);
                rowData.s2Total = String(s2Count);
                rowData.grandTotal = String(s1Count + s2Count);

                const row = worksheet.addRow(rowData);

                row.eachCell((cell, colNumber) => {
                    if (colNumber > 2 && colNumber <= daysInThisMonth + 2) {
                        if (cell.value === "B/D") cell.font = { color: { argb: "FF059669" }, bold: true };
                        if (cell.value === "-") cell.font = { color: { argb: "FFA1A1AA" } };
                    }
                    cell.alignment = { horizontal: "center" };
                    cell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" },
                    };
                });
            }
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Meal_Tracker_Report_${new Date().toLocaleDateString()}.xlsx`;
    a.click();
};
