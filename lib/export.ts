import { notoEthiopicBase64 } from "./fonts";
import { calculateMealStats } from "./meal-stats";

import jsPDF from "jspdf";
import ExcelJS from "exceljs";
import autoTable from "jspdf-autotable";
import { monthNames, toGC, toEC } from "kenat";
import { Customer, MealLog, db } from "@/lib/db";
import { getFullDate } from "@/lib/helper-functions";

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
        worksheet.pageSetup = {
            orientation: "landscape",
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
        };
        worksheet.pageSetup.printArea = "A1:AI100";

        worksheet.columns = [
            { header: "ስም", key: "name", width: 25 },
            { header: "ማብቂያ ቀን", key: "endDate", width: 18 },
            ...Array.from({ length: daysInThisMonth }, (_, i) => ({
                header: (i + 1).toString().padStart(2, "0"),
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

        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        try {
            const fontBase64 = notoEthiopicBase64.replace(/^data:font\/ttf;base64,/, "");
            doc.addFileToVFS("NotoSans.ttf", fontBase64);
            doc.addFont("NotoSans.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans");
        } catch (e) {
            console.error("PDF Font Load Failed", e);
        }

        const pdfHeaders = ["ስም", "ማብቂያ ቀን", ...Array.from({ length: daysInThisMonth }, (_, i) => (i + 1).toString().padStart(2, "0")), "ቁርስ", "እራት", "ጠቅላላ"];

        const pdfRows: (string | number)[][] = [];

        customers.forEach((customer) => {
            const customerLogs = allLogs.filter((log) => log.customerId === customer.id);
            const activeContract = allContracts.find((c) => c.customerId === customer.id && c.status === "active");
            const stats = calculateMealStats(activeContract, customerLogs);

            const endDateText = activeContract ? getFullDate(stats.dynamicEndDate.toISOString()) : "ውል የለም";

            const rowData: Record<string, string> = {
                name: customer.name,
                endDate: endDateText,
            };

            let s1Count = 0;
            let s2Count = 0;
            let hasActivity = false;
            const pdfDayData: string[] = [];

            for (let d = 1; d <= daysInThisMonth; d++) {
                const gc = toGC(year, monthNum, d);
                const logDate = `${gc.year}-${gc.month.toString().padStart(2, "0")}-${gc.day.toString().padStart(2, "0")}`;

                const s1 = allLogs.find((l) => l.customerId === customer.id && l.logDate === logDate && l.slot === "slot1");
                const s2 = allLogs.find((l) => l.customerId === customer.id && l.logDate === logDate && l.slot === "slot2");

                if (s1 || s2) {
                    hasActivity = true;
                    if (s1) s1Count++;
                    if (s2) s2Count++;
                    const val = s1 && s2 ? "✓✓" : s1 ? "✓-" : "-✓";
                    rowData[`day${d}`] = val;
                    pdfDayData.push(val);
                } else {
                    rowData[`day${d}`] = "-";
                    pdfDayData.push("-");
                }
            }

            if (hasActivity || activeContract) {
                rowData.s1Total = String(s1Count);
                rowData.s2Total = String(s2Count);
                rowData.grandTotal = String(s1Count + s2Count);
                const exRow = worksheet.addRow(rowData);
                exRow.eachCell((cell) => {
                    cell.alignment = { horizontal: "center" };
                    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                });

                pdfRows.push([customer.name, endDateText, ...pdfDayData, s1Count, s2Count, s1Count + s2Count]);
            }
        });

        if (pdfRows.length > 0) {
            doc.setFont("NotoSans");
            doc.setFontSize(14);
            doc.text(`የምግብ መዝገብ (Meal Log Report): ${monthName} ${year}`, 14, 12);

            autoTable(doc, {
                head: [pdfHeaders],
                body: pdfRows,
                startY: 18,
                theme: "grid",
                styles: {
                    font: "NotoSans",
                    fontSize: 7,
                    halign: "center",
                },
                headStyles: {
                    font: "NotoSans",
                    fillColor: [31, 41, 55],
                    textColor: [255, 255, 255],
                },
                columnStyles: {
                    0: { halign: "left", cellWidth: 35 },
                    1: { cellWidth: 25 },
                },
            });

            doc.save(`Meal_Log_${monthName}_${year}.pdf`);
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Meal_Master_History.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};
