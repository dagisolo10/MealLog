"use client";
import ExcelJS from "exceljs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Table, TableBody, TableHeader, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Search, Minus, CalendarDays, Download } from "lucide-react";
import { Customer, db } from "@/lib/db";
import CustomerDetailsModal from "./customer-detail";
import { useLiveQuery } from "dexie-react-hooks";
import { Label } from "./ui/label";
import { monthNames, toEC, toGC } from "kenat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaginatedTable from "./paginated-table";
import { Button } from "./ui/button";

export default function CustomerTable({ customers }: { customers: Customer[] }) {
    const [query, setQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const today = new Date();
    const currentEth = toEC(today.getFullYear(), today.getMonth() + 1, today.getDate());

    const activeYear = currentEth.year;
    const [selectedMonth, setSelectedMonth] = useState(currentEth.month.toString());

    const allLogs = useLiveQuery(() => db.mealLogs.toArray());
    const filtered = useMemo(() => [...customers].filter((customer) => customer.name.toLowerCase().includes(query.toLowerCase())), [customers, query]);

    const perPage = 60;
    const startIndex = (currentPage - 1) * perPage;
    const totalPages = Math.ceil(customers.length / perPage);
    const paginatedCustomers = filtered.slice(startIndex, startIndex + perPage);

    const daysInMonth = useMemo(() => {
        const month = Number(selectedMonth);
        if (month < 12) return 30;
        if (month === 12) return 30;

        const isLeap = (activeYear + 1) % 4 === 0;
        return isLeap ? 6 : 5;
    }, [selectedMonth, activeYear]);

    const isChecked = (customerId: number, dayIndex: number, slot: "slot1" | "slot2") => {
        if (!allLogs) return false;

        const gcDate = toGC(activeYear, parseInt(selectedMonth), dayIndex + 1);
        const logDate = `${gcDate.year}-${gcDate.month.toString().padStart(2, "0")}-${gcDate.day.toString().padStart(2, "0")}`;

        return allLogs.some((log) => log.customerId === customerId && log.logDate === logDate && log.slot === slot);
    };

    const handleToggle = async (customer: Customer, dayIndex: number, slot: "slot1" | "slot2") => {
        const day = dayIndex + 1;
        const month = parseInt(selectedMonth);
        const year = activeYear;

        const gcDate = toGC(year, month, day);

        const logDate = `${gcDate.year}-${gcDate.month.toString().padStart(2, "0")}-${gcDate.day.toString().padStart(2, "0")}`;

        const existing = allLogs?.find((log) => log.customerId === customer.id && log.logDate === logDate && log.slot === slot);

        if (existing) await db.mealLogs.delete(existing.id);
        else await db.mealLogs.add({ customerId: customer.id, logDate: logDate, slot: slot, timestamp: new Date(), synced: false });
    };

    const exportFullHistory = async () => {
        if (customers.length === 0) return;

        const workbook = new ExcelJS.Workbook();

        const allStartDates = customers.map((c) => new Date(c.startDate));
        const allEndDates = customers.map((c) => {
            const d = new Date(c.startDate);
            d.setDate(d.getDate() + 30);
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

            const worksheet = workbook.addWorksheet(`${monthName} ${year}`);

            worksheet.columns = [
                { header: "Customer Name", key: "name", width: 25 },
                ...Array.from({ length: 30 }, (_, i) => ({
                    header: (i + 1).toString(),
                    key: `day${i + 1}`,
                    width: 6,
                })),
                { header: "S1 Total", key: "s1Total", width: 10 },
                { header: "S2 Total", key: "s2Total", width: 10 },
                { header: "Grand Total", key: "grandTotal", width: 12 },
            ];

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.alignment = { horizontal: "center", vertical: "middle" };
            headerRow.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFE5E7EB" },
            };

            let visibleRowIndex = 0;

            customers.forEach((customer) => {
                const cStart = toEC(new Date(customer.startDate).getFullYear(), new Date(customer.startDate).getMonth() + 1, new Date(customer.startDate).getDate());

                const endDateObj = new Date(customer.startDate);
                endDateObj.setDate(endDateObj.getDate() + 30);
                const cEnd = toEC(endDateObj.getFullYear(), endDateObj.getMonth() + 1, endDateObj.getDate());

                const isBeforeMonth = year < cStart.year || (year === cStart.year && monthNum < cStart.month);
                const isAfterMonth = year > cEnd.year || (year === cEnd.year && monthNum > cEnd.month);

                if (isBeforeMonth || isAfterMonth) return;

                let s1Count = 0;
                let s2Count = 0;
                const rowData: Record<string, string> = { name: customer.name };

                for (let d = 1; d <= 30; d++) {
                    const gc = toGC(year, monthNum, d);
                    const logDate = `${gc.year}-${gc.month.toString().padStart(2, "0")}-${gc.day.toString().padStart(2, "0")}`;

                    const s1 = allLogs?.some((l) => l.customerId === customer.id && l.logDate === logDate && l.slot === "slot1");
                    const s2 = allLogs?.some((l) => l.customerId === customer.id && l.logDate === logDate && l.slot === "slot2");

                    if (s1) s1Count++;
                    if (s2) s2Count++;

                    rowData[`day${d}`] = `${s1 ? "✓" : "-"} | ${s2 ? "✓" : "-"}`;
                }

                rowData.s1Total = s1Count.toString();
                rowData.s2Total = s2Count.toString();
                rowData.grandTotal = (s1Count + s2Count).toString();

                const row = worksheet.addRow(rowData);
                visibleRowIndex++;

                if (visibleRowIndex % 2 === 0) {
                    row.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFF9FAFB" },
                    };
                }

                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFD1D5DB" } },
                        left: { style: "thin", color: { argb: "FFD1D5DB" } },
                        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
                        right: { style: "thin", color: { argb: "FFD1D5DB" } },
                    };
                    cell.alignment = { horizontal: "center" };
                });

                row.getCell("name").alignment = { horizontal: "left" };
                row.getCell("s1Total").font = { color: { argb: "FF2563EB" }, bold: true };
                row.getCell("s2Total").font = { color: { argb: "FFEA580C" }, bold: true };
                row.getCell("grandTotal").font = { bold: true };
            });
        }

        // 5. Finalize and Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Meal_Tracker_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        const isCurrentMonth = selectedMonth === currentEth.month.toString();

        const targetId = isCurrentMonth ? `day-col-${currentEth.day}` : `day-col-1`;

        const timer = setTimeout(() => {
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center",
                });
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [selectedMonth, currentEth.day, currentEth.month, currentPage]);

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col items-end justify-between gap-4 rounded-lg border p-4">
                <div className="group relative w-full">
                    <Label htmlFor="query" className="text-muted-foreground mb-2 block">
                        Find Customer
                    </Label>
                    <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." id="query" className="pl-9" />
                    </div>
                </div>

                <div className="flex w-full items-end gap-2">
                    <div className="w-full">
                        <Label className="text-muted-foreground mb-2 block">Ethiopian Month</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="text-primary w-full py-5 text-lg font-bold">
                                <CalendarDays className="mr-2 size-4 opacity-50" />
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>

                            <SelectContent className="w-full">
                                {monthNames.amharic.map((name, i) => (
                                    <SelectItem key={i} value={(i + 1).toString()} className="text-lg font-medium">
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="secondary" onClick={exportFullHistory} className="flex items-center gap-2">
                        <Download className="size-4" />
                        Export
                    </Button>
                </div>
            </div>

            <div className="bg-background overflow-hidden rounded-md border">
                <div className={paginatedCustomers.length === 0 ? "overflow-hidden" : "overflow-x-auto"} ref={tableContainerRef}>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="bg-background text-muted-foreground sticky left-0 z-30 w-12 border-r text-center">#</TableHead>
                                <TableHead className="min-w-48 border-r">Name</TableHead>
                                {Array.from({ length: daysInMonth }).map((_, index) => {
                                    const dayNum = index + 1;
                                    const isToday = dayNum === currentEth.day && selectedMonth === currentEth.month.toString();

                                    return (
                                        <TableHead id={`day-col-${dayNum}`} className={`min-w-15 border-r pr-2 text-center transition-colors ${isToday ? "text-foreground bg-blue-500/10 font-black" : "text-muted-foreground"}`} key={index}>
                                            {dayNum.toString().padStart(2, "0")}
                                            {isToday && <div className="text-[8px] text-blue-500">Today</div>}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {paginatedCustomers.length === 0 ? (
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableCell colSpan={currentEth.day - 2} className="h-72 border-none" />

                                    <TableCell className="relative border-none p-0">
                                        <div className="absolute top-1/2 left-1/2 w-64 -translate-x-1/2 -translate-y-1/2 space-y-3 text-center">
                                            <div className="bg-muted mx-auto w-fit rounded-full p-4">
                                                <Search className="text-muted-foreground size-8 opacity-20" />
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-lg font-semibold tracking-tight whitespace-nowrap">No customers found</p>
                                                <p className="text-muted-foreground text-sm">No results for &quot;{query}&quot;</p>
                                            </div>

                                            <Button variant="outline" size="sm" onClick={() => setQuery("")} className="mt-2">
                                                Clear Search
                                            </Button>
                                        </div>
                                    </TableCell>

                                    <TableCell colSpan={30 - currentEth.day} className="border-none" />
                                </TableRow>
                            ) : (
                                paginatedCustomers.map((customer, index) => {
                                    const actualIndex = startIndex + index + 1;
                                    const customerStartDate = new Date(customer.startDate);
                                    const { year, month, day } = toEC(customerStartDate.getFullYear(), customerStartDate.getMonth() + 1, customerStartDate.getDate());
                                    const pageMonth = Number(selectedMonth);
                                    const pageYear = activeYear;
                                    const isPageBeforeJoin = pageYear < year || (pageYear === year && pageMonth < month);
                                    const isStartMonth = pageYear === year && pageMonth === month;

                                    return (
                                        <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="bg-background sticky left-0 z-10 border-r text-center">{actualIndex}</TableCell>

                                            <TableCell className="min-w-48 border-r">
                                                <CustomerDetailsModal customer={customer}>
                                                    <div className="grid cursor-pointer text-left">
                                                        <span className="min-w-full truncate text-lg font-medium">{customer.name}</span>
                                                        <span className="text-muted-foreground text-sm">
                                                            {monthNames.amharic[month - 1]} {day}, {year}
                                                        </span>
                                                    </div>
                                                </CustomerDetailsModal>
                                            </TableCell>
                                            {Array.from({ length: daysInMonth }).map((_, index) => {
                                                const dayNumber = index + 1;

                                                const shouldShowDash = isPageBeforeJoin || (isStartMonth && dayNumber < day);

                                                return (
                                                    <TableCell key={index} className="border-r p-0 text-center">
                                                        {shouldShowDash ? (
                                                            <div className="flex h-12 items-center justify-center opacity-10">
                                                                <Minus className="size-3" />
                                                            </div>
                                                        ) : (
                                                            <div className="flex h-12 items-center justify-center gap-1 px-1">
                                                                <Checkbox
                                                                    checked={isChecked(customer.id, index, "slot1")}
                                                                    onCheckedChange={() => handleToggle(customer, index, "slot1")}
                                                                    className="size-4 border-blue-400/40 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500!"
                                                                />
                                                                <Checkbox
                                                                    checked={isChecked(customer.id, index, "slot2")}
                                                                    onCheckedChange={() => handleToggle(customer, index, "slot2")}
                                                                    className="size-4 border-orange-400/40 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500!"
                                                                />
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <PaginatedTable currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
        </div>
    );
}
