import ExcelJS from "exceljs";
import { Customer, MealLog } from "@/lib/db"; // Adjust types as needed
import { monthNames, toGC, toEC } from "kenat";
import {  getFullDate } from "@/lib/helper-functions";
import { calculateMealStats } from "./meal-stats";

export const exportFullHistory = async (customers: Customer[], allLogs: MealLog[]) => {
    if (customers.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const logs = allLogs;

    const allStartDates = customers.map((c) => new Date(c.startDate));
    const allEndDates = customers.map((c) => {
        const consumed = logs.filter((l) => l.customerId === c.id).length;
        const d = new Date(c.startDate);
        d.setDate(d.getDate() + (30 + (30 - Math.ceil(consumed / 2))));
        return d;
    });

    const minDate = new Date(Math.min(...allStartDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allEndDates.map((d) => d.getTime())));

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

        let daysInThisMonth = 30;
        if (monthNum === 13) {
            const isLeap = (year + 1) % 4 === 0;
            daysInThisMonth = isLeap ? 6 : 5;
        }

        const worksheet = workbook.addWorksheet(`${monthName} ${year}`);

        worksheet.columns = [
            { header: "Customer Name", key: "name", width: 28 },
            { header: "Start Date", key: "startDate", width: 18 },
            { header: "Est. End Date", key: "endDate", width: 18 },
            ...Array.from({ length: daysInThisMonth }, (_, i) => ({
                header: (i + 1).toString(),
                key: `day${i + 1}`,
                width: 7,
            })),
            { header: "Slot 1", key: "s1Total", width: 8 },
            { header: "Slot 2", key: "s2Total", width: 8 },
            { header: "Total", key: "grandTotal", width: 10 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, size: 11 };
        headerRow.height = 25;
        headerRow.alignment = { horizontal: "center", vertical: "middle" };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };

        let visibleRowIndex = 0;

        customers.forEach((customer) => {
            const customerLogs = logs.filter((log) => log.customerId === customer.id);
            const stats = calculateMealStats(customer, customerLogs);
            const cStart = toEC(new Date(customer.startDate).getFullYear(), new Date(customer.startDate).getMonth() + 1, new Date(customer.startDate).getDate());

            const rowData: Record<string, string> = {
                name: customer.name,
                startDate: getFullDate(customer.startDate),
                endDate: getFullDate(stats.dynamicEndDate.toISOString()),
            };

            let s1Count = 0;
            let s2Count = 0;
            let hasLogsInMonth = false;

            for (let d = 1; d <= daysInThisMonth; d++) {
                const gc = toGC(year, monthNum, d);
                const logDate = `${gc.year}-${gc.month.toString().padStart(2, "0")}-${gc.day.toString().padStart(2, "0")}`;

                const s1 = logs.some((l) => l.customerId === customer.id && l.logDate === logDate && l.slot === "slot1");
                const s2 = logs.some((l) => l.customerId === customer.id && l.logDate === logDate && l.slot === "slot2");

                if (s1 || s2) hasLogsInMonth = true;
                if (s1) s1Count++;
                if (s2) s2Count++;

                rowData[`day${d}`] = `${s1 ? "✓" : "-"}${s2 ? "✓" : "-"}`;
            }

            if (!hasLogsInMonth && (year < cStart.year || (year === cStart.year && monthNum < cStart.month))) return;

            rowData.s1Total = s1Count.toString();
            rowData.s2Total = s2Count.toString();
            rowData.grandTotal = (s1Count + s2Count).toString();

            const row = worksheet.addRow(rowData);
            row.height = 20;
            visibleRowIndex++;

            if (visibleRowIndex % 2 === 0) {
                row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
            }

            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: "thin", color: { argb: "FFD1D5DB" } },
                    left: { style: "thin", color: { argb: "FFD1D5DB" } },
                    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
                    right: { style: "thin", color: { argb: "FFD1D5DB" } },
                };
                cell.alignment = { horizontal: "center", vertical: "middle" };
            });
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Meal_Tracker_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};
