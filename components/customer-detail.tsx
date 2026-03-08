"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Customer, db, MealSlot } from "@/lib/db";
import { getFullDate } from "@/lib/helper-functions";
import DeleteAlertDialog from "./delete-alert-dialog";
import { useLiveQuery } from "dexie-react-hooks";
import { format, startOfDay, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Check, Utensils, AlertCircle } from "lucide-react";

export default function CustomerDetailsModal({ customer, children }: { customer: Customer; children: React.ReactNode }) {
    const [loading, setLoading] = useState(false);

    const todayStr = format(new Date(), "yyyy-MM-dd");

    const todaysLogs = useLiveQuery(
        () =>
            db.mealLogs
                .where("customerId")
                .equals(customer.id)
                .and((log) => log.logDate === todayStr)
                .toArray(),
        [customer.id, todayStr],
    );

    const hasEaten = (slot: MealSlot) => todaysLogs?.some((log) => log.slot === slot) ?? false;

    const handleLogMeal = async (slot: MealSlot) => {
        if (hasEaten(slot)) return;

        setLoading(true);
        try {
            await db.mealLogs.add({ customerId: customer.id, slot: slot, logDate: todayStr, timestamp: new Date(), synced: false });
        } catch (err) {
            console.error("Meal already logged or DB error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        await db.mealLogs.where("customerId").equals(customer.id).delete();
        await db.customers.delete(customer.id);
    };

    const todayDate = startOfDay(new Date());
    const expirationDate = startOfDay(new Date(customer.endDate));
    const daysLeft = differenceInDays(expirationDate, todayDate);
    const isExpired = daysLeft < 0;
    const isWarning = daysLeft >= 0 && daysLeft <= 3;

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>

            <DialogContent className="top-[40%]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                        {isExpired ? (
                            <span className="text-destructive font-bold tracking-tighter uppercase">Expired</span>
                        ) : isWarning ? (
                            <span className="animate-pulse font-bold text-amber-600">Expiring Soon: {daysLeft === 0 ? "Ends Today" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}</span>
                        ) : (
                            <span className="text-muted-foreground">{daysLeft} days remaining</span>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {isExpired && (
                        <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-3 text-xs font-bold">
                            <AlertCircle className="size-4" />
                            Plan expired. Please renew (5,000 Birr).
                        </div>
                    )}

                    <div className="space-y-4 border-t pt-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Contract Start</span>
                            <span className="font-medium">{getFullDate(customer.startDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Contract End</span>
                            <span className="font-medium">{getFullDate(customer.endDate)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-4">
                        <DeleteAlertDialog customerName={customer.name} onDelete={handleDelete} />
                        <div className={`flex items-center gap-1.5 font-medium ${customer.isActive ? "text-green-500" : "text-rose-500"}`}>
                            <div className={`size-1.5 rounded-full ${customer.synced ? "bg-blue-600" : "animate-pulse bg-amber-600"}`} />
                            {customer.isActive ? "Active" : "Expired"}
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <MealButton label="Meal Slot 1" disabled={isExpired || loading} isDone={hasEaten("slot1")} onClick={() => handleLogMeal("slot1")} />
                        <MealButton label="Meal Slot 2" disabled={isExpired || loading} isDone={hasEaten("slot2")} onClick={() => handleLogMeal("slot2")} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MealButton({ label, isDone, onClick, disabled }: { label: string; isDone: boolean; onClick: () => void; disabled: boolean }) {
    return (
        <Button variant={isDone ? "default" : "outline"} className={`h-20 w-full justify-between px-4 transition-all ${isDone ? "bg-green-600 hover:bg-green-700" : "hover:border-primary"}`} onClick={onClick} disabled={isDone || disabled}>
            <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${isDone ? "bg-white/20" : "bg-secondary"}`}>
                    <Utensils className="size-5" />
                </div>
                <div className="text-left">
                    <p className="font-bold">{label}</p>
                    <p className="text-[10px] opacity-70">{isDone ? "Confirmed" : disabled ? "Locked" : "Tap to check in"}</p>
                </div>
            </div>
            {isDone && <Check className="size-6 stroke-[3px]" />}
        </Button>
    );
}
