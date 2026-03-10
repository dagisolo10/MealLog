"use client";
import { useMemo, useRef, useState } from "react";
import { Table, TableBody, TableHeader, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Search, Minus, CalendarDays } from "lucide-react";
import { Customer, db } from "@/lib/db";
import CustomerDetailsModal from "./customer-detail";
import { useLiveQuery } from "dexie-react-hooks";
import { monthNames, toEC, toGC } from "kenat";
import PaginatedTable from "./paginated-table";
import { Button } from "./ui/button";
import { getFullDate } from "@/lib/helper-functions";
import { calculateMealStats } from "@/lib/meal-stats";
import { cn } from "@/lib/utils";

export default function CustomerTable({ customers }: { customers: Customer[] }) {
    const [query, setQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const todayRef = useRef<HTMLTableCellElement>(null);
    const startRef = useRef<HTMLTableHeaderCellElement>(null);

    const today = new Date();
    const currentEth = toEC(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const activeYear = currentEth.year;
    const [selectedMonth, setSelectedMonth] = useState(currentEth.month.toString());

    const allLogs = useLiveQuery(() => db.mealLogs.toArray()) || [];
    const allActiveContracts = useLiveQuery(() => db.contracts.where("status").equals("active").toArray()) || [];

    const filtered = useMemo(() => customers.filter((customer) => customer.name.toLowerCase().includes(query.toLowerCase())), [customers, query]);

    const perPage = 60;
    const startIndex = (currentPage - 1) * perPage;
    const totalPages = Math.ceil(filtered.length / perPage);
    const paginatedCustomers = filtered.slice(startIndex, startIndex + perPage);

    const daysInMonth = useMemo(() => {
        const month = Number(selectedMonth);
        if (month <= 12) return 30;
        const isLeap = (activeYear + 1) % 4 === 0;
        return isLeap ? 6 : 5;
    }, [selectedMonth, activeYear]);

    const isChecked = (customerId: number, dayIndex: number, slot: "slot1" | "slot2") => {
        const gcDate = toGC(activeYear, parseInt(selectedMonth), dayIndex + 1);
        const logDate = `${gcDate.year}-${gcDate.month.toString().padStart(2, "0")}-${gcDate.day.toString().padStart(2, "0")}`;
        return allLogs.some((log) => log.customerId === customerId && log.logDate === logDate && log.slot === slot);
    };

    const handleToggle = async (customerId: number, contractId: number | undefined, dayIndex: number, slot: "slot1" | "slot2") => {
        if (!contractId) return;

        const gcDate = toGC(activeYear, parseInt(selectedMonth), dayIndex + 1);
        const logDate = `${gcDate.year}-${gcDate.month.toString().padStart(2, "0")}-${gcDate.day.toString().padStart(2, "0")}`;

        const existing = allLogs.find((log) => log.customerId === customerId && log.logDate === logDate && log.slot === slot);

        if (existing) {
            await db.mealLogs.delete(existing.id!);
        } else {
            await db.mealLogs.add({
                customerId,
                contractId,
                logDate,
                slot,
                timestamp: new Date(),
            });
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex items-end gap-4">
                    <div className="group relative w-full">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="ፈልግ..."
                                id="query"
                                className="pl-9 text-lg"
                            />
                        </div>
                    </div>

                    {selectedMonth === currentEth.month.toString() && (
                        <Button
                            onClick={() =>
                                todayRef.current && todayRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
                            }
                            className="flex items-center gap-2 text-base"
                        >
                            <CalendarDays className="size-4" />
                            ወደ ዛሬ
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {monthNames.amharic.map((name, i) => {
                        const monthVal = (i + 1).toString();
                        const isSelected = selectedMonth === monthVal;
                        const isCurrentMonth = currentEth.month.toString() === monthVal;

                        return (
                            <Button
                                key={i}
                                onClick={() => setSelectedMonth(monthVal)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center rounded-md border px-4 py-2 transition-all",
                                    isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground",
                                    isCurrentMonth && !isSelected ? "border-2 border-blue-500 text-blue-500" : "",
                                )}
                            >
                                <span className="text-lg">{name}</span>

                                {isCurrentMonth && (
                                    <div className={`absolute -top-1 -right-1 size-2 rounded-full bg-blue-500 ${isSelected ? "hidden" : "block"}`} />
                                )}
                            </Button>
                        );
                    })}
                </div>
            </div>

            <div className={cn("rounded-md border", paginatedCustomers.length === 0 ? "overflow-hidden" : "overflow-x-auto")}>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="bg-background text-muted-foreground sticky left-0 z-30 min-w-16 border-r text-center">#</TableHead>
                            <TableHead ref={startRef} className="min-w-48 border-r">
                                ስም / ማብቂያ ቀን
                            </TableHead>
                            <TableHead className="min-w-24 border-r">ቀሪ ሂሳብ</TableHead>
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const dayNum = i + 1;
                                const isToday = dayNum === currentEth.day && selectedMonth === currentEth.month.toString();
                                return (
                                    <TableHead
                                        key={i}
                                        ref={isToday ? todayRef : null}
                                        className={cn(
                                            "min-w-18 border-r pr-2 text-center transition-colors",
                                            isToday ? "text-background bg-foreground font-black" : "text-muted-foreground/90",
                                        )}
                                    >
                                        {dayNum.toString().padStart(2, "0")}
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
                            paginatedCustomers.map((customer, idx) => {
                                const actualIndex = startIndex + idx + 1;
                                const activeContract = allActiveContracts.find((c) => c.customerId === customer.id);
                                const customerLogs = allLogs.filter((l) => l.customerId === customer.id);
                                const stats = calculateMealStats(activeContract, customerLogs);
                                const remaining = (stats.remainingAmount && stats.remainingAmount) || 0;
                                const fullyPaid = remaining <= 0;

                                const pageMonth = Number(selectedMonth);
                                const contractStart = activeContract
                                    ? toEC(
                                          new Date(activeContract.startDate).getFullYear(),
                                          new Date(activeContract.startDate).getMonth() + 1,
                                          new Date(activeContract.startDate).getDate(),
                                      )
                                    : null;

                                return (
                                    <TableRow key={customer.id}>
                                        <TableCell
                                            onClick={() =>
                                                startRef.current &&
                                                startRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
                                            }
                                            className="bg-background sticky left-0 z-10 border-r text-center text-lg"
                                        >
                                            {actualIndex}
                                        </TableCell>
                                        <TableCell className="min-w-48 border-r">
                                            <CustomerDetailsModal customer={customer}>
                                                <div className="cursor-pointer space-y-0.5">
                                                    <div className="text-base font-bold">{customer.name}</div>
                                                    <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-base">
                                                        <span>{getFullDate(stats.dynamicEndDate.toISOString())}</span>
                                                        <span>({stats.finishSlotLabel})</span>
                                                    </div>
                                                </div>
                                            </CustomerDetailsModal>
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                "min-w-24 border-r text-center text-lg font-black",
                                                fullyPaid ? "text-emerald-500" : "text-rose-500",
                                            )}
                                        >
                                            {fullyPaid ? "ተከፍሏል" : stats.remainingAmount}
                                        </TableCell>

                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const dayNum = i + 1;
                                            const isBeforeJoin =
                                                !contractStart ||
                                                activeYear < contractStart.year ||
                                                (activeYear === contractStart.year && pageMonth < contractStart.month) ||
                                                (activeYear === contractStart.year &&
                                                    pageMonth === contractStart.month &&
                                                    dayNum < contractStart.day);

                                            const isFirstDay =
                                                contractStart &&
                                                activeYear === contractStart.year &&
                                                pageMonth === contractStart.month &&
                                                dayNum === contractStart.day;
                                            const hideSlot1 = isFirstDay && activeContract?.startSlot === "slot2";

                                            const isToday = dayNum === currentEth.day && selectedMonth === currentEth.month.toString();

                                            return (
                                                <TableCell
                                                    key={i}
                                                    className={cn(
                                                        "border-r p-0 text-center transition-colors",
                                                        isToday && "bg-accent ring-x-1 ring-primary/20", // Light highlight for the column
                                                    )}
                                                >
                                                    {isBeforeJoin ? (
                                                        <Minus className="mx-auto size-3 opacity-40" />
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-3">
                                                            {!hideSlot1 ? (
                                                                <Checkbox
                                                                    checked={isChecked(customer.id!, i, "slot1")}
                                                                    onCheckedChange={() => handleToggle(customer.id!, activeContract?.id, i, "slot1")}
                                                                    className="size-5 border-blue-400 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500! dark:border-blue-400/40"
                                                                />
                                                            ) : (
                                                                <Minus className="size-3 opacity-40" />
                                                            )}
                                                            <Checkbox
                                                                checked={isChecked(customer.id!, i, "slot2")}
                                                                onCheckedChange={() => handleToggle(customer.id!, activeContract?.id, i, "slot2")}
                                                                className="size-5 border-orange-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500! dark:border-orange-400/40"
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
            <PaginatedTable currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
        </div>
    );
}
