"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Customer, db, MealSlot } from "@/lib/db";
import { getFullDate } from "@/lib/helper-functions";
import DeleteAlertDialog from "./delete-alert-dialog";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Check, Utensils, AlertCircle } from "lucide-react";
import { calculateMealStats } from "@/lib/meal-stats";

export default function CustomerDetailsModal({ customer, children }: { customer: Customer; children: React.ReactNode }) {
    const [loading, setLoading] = useState(false);
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const allCustomerLogs = useLiveQuery(() => db.mealLogs.where("customerId").equals(customer.id).toArray(), [customer.id]) || [];

    const stats = calculateMealStats(customer, allCustomerLogs);
    const { isExpired, isWarning, daysLeft, totalSkips, totalEaten, mealsLeft, isOverEaten, startSlotLabel, finishSlotLabel, dynamicEndDate, extraFullDays, hasEatenSlot1, hasEatenSlot2 } = stats;

    const handleLogMeal = async (slot: MealSlot) => {
        const hasEaten = slot === "slot1" ? hasEatenSlot1 : hasEatenSlot2;
        if (hasEaten) return;

        setLoading(true);
        try {
            await db.mealLogs.add({ customerId: customer.id, slot, logDate: todayStr, timestamp: new Date(), synced: false });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        await db.mealLogs.where("customerId").equals(customer.id).delete();
        await db.customers.delete(customer.id);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="top-[50%]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                        {isExpired ? (
                            <span className="text-destructive font-bold tracking-tighter uppercase">Expired</span>
                        ) : isWarning ? (
                            <span className="animate-pulse font-bold text-amber-600">
                                Expiring Soon: {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                            </span>
                        ) : (
                            <div className="flex w-full items-center justify-between">
                                <span className="text-muted-foreground">{daysLeft} days remaining</span>
                                {totalSkips > 0 && (
                                    <span className="text-muted-foreground">
                                        +{totalSkips} extra {totalSkips > 1 ? "meals" : "meal"}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border p-3 text-center">
                            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Meals Eaten</p>
                            <p className="text-2xl font-black">{totalEaten}</p>
                        </div>
                        <div className="rounded-xl border p-3 text-center">
                            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Meals Left</p>
                            <p className={`text-2xl font-black ${mealsLeft <= 4 ? "text-amber-600" : ""}`}>{mealsLeft}</p>
                        </div>
                    </div>

                    {isOverEaten && (
                        <div className="bg-destructive text-destructive-foreground flex animate-pulse items-center gap-2 rounded-lg p-3 text-xs font-bold">
                            <AlertCircle className="size-4" />
                            Warning: Customer has exceeded the meal limit for this contract!
                        </div>
                    )}

                    {isExpired && (
                        <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-3 text-xs font-bold">
                            <AlertCircle className="size-4" />
                            Plan expired. Please renew (5,000 Birr).
                        </div>
                    )}

                    <div className="space-y-4 border-t pt-4 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                    Contract Start <span className="text-secondary-foreground text-xs">({startSlotLabel})</span>
                                </span>
                            </div>
                            <span className="font-medium">{getFullDate(customer.startDate)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                    Adjusted End <span className="text-secondary-foreground text-xs">({finishSlotLabel})</span>
                                </span>
                            </div>
                            <span className="font-medium text-blue-600">{getFullDate(dynamicEndDate.toISOString())}</span>
                        </div>

                        {extraFullDays > 0 && (
                            <div className="border-t pt-4 text-right">
                                +{extraFullDays} bonus {extraFullDays > 1 ? "days" : "day"}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between border-t pt-4">
                        <DeleteAlertDialog customerName={customer.name} onDelete={handleDelete} />
                        <div className={`flex items-center gap-1.5 font-medium ${customer.isActive ? "text-green-500" : "text-rose-500"}`}>
                            <div className={`size-1.5 rounded-full ${customer.synced ? "bg-blue-600" : "animate-pulse bg-amber-600"}`} />
                            {customer.isActive ? "Active" : "Expired"}
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <MealButton label="Meal Slot 1" disabled={isExpired || loading} isDone={hasEatenSlot1} isWarning={isOverEaten && !hasEatenSlot1} onClick={() => handleLogMeal("slot1")} />
                        <MealButton label="Meal Slot 2" disabled={isExpired || loading} isDone={hasEatenSlot2} isWarning={isOverEaten && !hasEatenSlot2} onClick={() => handleLogMeal("slot2")} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MealButton({ label, isDone, onClick, disabled, isWarning }: { label: string; isDone: boolean; onClick: () => void; disabled: boolean; isWarning?: boolean }) {
    return (
        <Button
            variant={isDone ? "default" : "outline"}
            onClick={onClick}
            disabled={isDone || disabled}
            className={`h-20 w-full justify-between px-4 transition-all ${isDone ? "bg-green-500 hover:bg-green-700" : isWarning ? "border-destructive/40! text-destructive/70 hover:bg-destructive/5" : "hover:border-primary"}`}
        >
            <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${isDone ? "bg-white/20" : isWarning ? "bg-destructive/10" : "bg-secondary"}`}>
                    <Utensils className="size-5" />
                </div>
                <div className="text-left">
                    <p className="font-bold">{label}</p>
                    <p className="text-[10px] opacity-70">{isDone ? "Confirmed" : isWarning ? "Limit Exceeded!" : disabled ? "Locked" : "Tap to check in"}</p>
                </div>
            </div>
            {isDone && <Check className="text-foreground size-6 stroke-[3px]" />}
        </Button>
    );
}
