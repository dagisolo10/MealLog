"use client";
import { useMemo, useRef, useState } from "react";
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
import { getFullDate } from "@/lib/helper-functions";
import { exportFullHistory } from "@/lib/export";
import { calculateMealStats } from "@/lib/meal-stats";

export default function CustomerTable({ customers }: { customers: Customer[] }) {
    const [query, setQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const todayRef = useRef<HTMLTableCellElement>(null);

    const today = new Date();
    const currentEth = toEC(today.getFullYear(), today.getMonth() + 1, today.getDate());

    const activeYear = currentEth.year;
    const [selectedMonth, setSelectedMonth] = useState(currentEth.month.toString());

    const allLogs = useLiveQuery(() => db.mealLogs.toArray()) || [];
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
        else await db.mealLogs.add({ customerId: customer.id!, logDate: logDate, slot: slot, timestamp: new Date(), synced: false });
    };

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

                    {selectedMonth === currentEth.month.toString() && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                if (todayRef.current) todayRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                            }}
                            className="flex items-center gap-2 border-blue-500/50 text-blue-600 dark:text-blue-400"
                        >
                            <CalendarDays className="size-4" /> Today
                        </Button>
                    )}

                    <Button onClick={() => exportFullHistory(customers, allLogs)} className="flex items-center gap-2">
                        <Download className="size-4" /> Export
                    </Button>
                </div>
            </div>

            <div className="bg-background overflow-hidden rounded-md border">
                <div className={paginatedCustomers.length === 0 ? "overflow-hidden" : "overflow-x-auto"}>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="bg-background text-muted-foreground sticky left-0 z-30 w-12 border-r text-center">#</TableHead>
                                <TableHead className="min-w-48 border-r">Name</TableHead>
                                {Array.from({ length: daysInMonth }).map((_, index) => {
                                    const dayNum = index + 1;
                                    const isToday = dayNum === currentEth.day && selectedMonth === currentEth.month.toString();
                                    return (
                                        <TableHead key={index} ref={isToday ? todayRef : null} className={`min-w-15 border-r pr-2 text-center transition-colors ${isToday ? "text-foreground bg-blue-500/10 font-black" : "text-muted-foreground"}`}>
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
                                    <TableCell colSpan={currentEth.day + 2} className="h-72 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <Search className="text-muted-foreground size-8 opacity-20" />
                                            <p className="text-lg font-semibold whitespace-nowrap">No customers found</p>
                                            <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                                                Clear Search
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCustomers.map((customer, index) => {
                                    const actualIndex = startIndex + index + 1;
                                    const customerLogs = allLogs.filter((l) => l.customerId === customer.id);
                                    const stats = calculateMealStats(customer, customerLogs);

                                    const customerStartDate = new Date(customer.startDate);
                                    const { year, month, day } = toEC(customerStartDate.getFullYear(), customerStartDate.getMonth() + 1, customerStartDate.getDate());
                                    const pageMonth = Number(selectedMonth);
                                    const isPageBeforeJoin = activeYear < year || (activeYear === year && pageMonth < month);
                                    const isStartMonth = activeYear === year && pageMonth === month;

                                    return (
                                        <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="bg-background sticky left-0 z-10 border-r text-center">{actualIndex}</TableCell>
                                            <TableCell className="min-w-48 border-r">
                                                <CustomerDetailsModal customer={customer}>
                                                    <div className="grid cursor-pointer py-1 text-left">
                                                        <span className="min-w-full truncate text-lg leading-tight font-medium">{customer.name}</span>
                                                        <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                            <span className="text-sm">{getFullDate(stats.dynamicEndDate.toISOString())}</span>
                                                            <span className="text-xs">({stats.finishSlotLabel})</span>
                                                        </div>
                                                    </div>
                                                </CustomerDetailsModal>
                                            </TableCell>
                                            {Array.from({ length: daysInMonth }).map((_, index) => {
                                                const dayNumber = index + 1;
                                                const isFirstDay = isStartMonth && dayNumber === day;
                                                const shouldShowDash = isPageBeforeJoin || (isStartMonth && dayNumber < day);

                                                const hideSlot1 = isFirstDay && customer.startSlot === "slot2";

                                                return (
                                                    <TableCell key={index} className="border-r p-0 text-center">
                                                        {shouldShowDash ? (
                                                            <div className="flex h-12 items-center justify-center opacity-30">
                                                                <Minus className="size-3" />
                                                            </div>
                                                        ) : (
                                                            <div className="flex h-12 items-center justify-center gap-1 px-1">
                                                                {!hideSlot1 ? (
                                                                    <Checkbox
                                                                        checked={isChecked(customer.id!, index, "slot1")}
                                                                        onCheckedChange={() => handleToggle(customer, index, "slot1")}
                                                                        className="size-4 border-blue-400 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500! dark:border-blue-400/40"
                                                                    />
                                                                ) : (
                                                                    <Minus className="size-3 opacity-20" />
                                                                )}
                                                                <Checkbox
                                                                    checked={isChecked(customer.id!, index, "slot2")}
                                                                    onCheckedChange={() => handleToggle(customer, index, "slot2")}
                                                                    className="size-4 border-orange-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500! dark:border-orange-400/40"
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
