"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Customer, db, MealSlot } from "@/lib/db";
import DeleteAlertDialog from "./delete-alert-dialog";
import { useLiveQuery } from "dexie-react-hooks";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Utensils, AlertCircle, Wallet } from "lucide-react";
import { calculateMealStats } from "@/lib/meal-stats";
import { cn } from "@/lib/utils";
import { getFullDate } from "@/lib/helper-functions";
import RenewContractDialog from "./renew-alert-dialog";

export default function CustomerDetailsModal({ customer, children }: { customer: Customer; children: React.ReactNode }) {
    const [loading, setLoading] = useState(false);
    const [paymentInput, setPaymentInput] = useState("");
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const activeContract = useLiveQuery(() => db.contracts.where({ customerId: customer.id, status: "active" }).first(), [customer.id]);

    const allCustomerLogs = useLiveQuery(() => db.mealLogs.where("customerId").equals(customer.id!).toArray(), [customer.id]) || [];

    const stats = calculateMealStats(activeContract, allCustomerLogs);

    const handleLogMeal = async (slot: MealSlot) => {
        if (!activeContract) return;
        const hasEaten = slot === "slot1" ? stats.hasEatenSlot1 : stats.hasEatenSlot2;
        if (hasEaten) return;

        setLoading(true);
        try {
            await db.mealLogs.add({ customerId: customer.id!, contractId: activeContract.id!, slot, logDate: todayStr, timestamp: new Date() });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePayment = async () => {
        if (!activeContract || !paymentInput) return;
        const newAmount = (activeContract.paidAmount || 0) + Number(paymentInput);
        await db.contracts.update(activeContract.id!, { paidAmount: newAmount });
        setPaymentInput("");
        window.location.reload();
    };

    const handleRenew = async (startSlot: MealSlot) => {
        const now = new Date();

        const endDate = addDays(now, 30);

        if (activeContract) await db.contracts.update(activeContract.id!, { status: "completed" });

        await db.contracts.add({
            customerId: customer.id!,
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            startSlot: startSlot,
            paidAmount: 0,
            status: "active",
        });
    };

    const handleDelete = async () => {
        if (!customer.id) return;
        await db.mealLogs.where("customerId").equals(customer.id).delete();
        await db.contracts.where("customerId").equals(customer.id).delete();
        await db.customers.delete(customer.id);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="top-[45%]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
                    <div className="mt-2 flex items-center gap-2 text-lg">
                        {stats.isExpired ? (
                            <span className="text-destructive font-bold tracking-tighter uppercase">Expired</span>
                        ) : stats.isWarning ? (
                            <span className="animate-pulse font-bold text-amber-600">በቅርቡ ያበቃል: {stats.daysLeft} ቀን ይቀራል</span>
                        ) : (
                            <div className="flex w-full items-center justify-between">
                                <span className="text-muted-foreground">{stats.daysLeft} ቀን ይቀራል</span>
                                {stats.totalSkips > 0 && <span className="text-muted-foreground">+{stats.totalSkips} ተጨማሪ ምግብ</span>}
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/20 rounded-xl border p-3 text-center">
                            <p className="text-muted-foreground text-lg font-bold uppercase">በልተዋል</p>
                            <p className="text-2xl font-black">{stats.totalEaten}</p>
                        </div>
                        <div className={cn("rounded-xl border p-3 text-center", stats.isExpired ? "bg-red-50" : "bg-muted/20")}>
                            <p className="text-muted-foreground text-lg font-bold uppercase">ቀሪ</p>
                            <p className={cn("text-2xl font-black", stats.statusColor)}>{stats.mealsLeft}</p>
                        </div>
                    </div>

                    {(stats.isExpired || stats.isOverEaten) && (
                        <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-3 text-lg font-bold">
                            <AlertCircle className="size-4" />
                            {stats.isOverEaten ? "Limit Exceeded!" : "ኮርትራቱ አልቋል"}
                        </div>
                    )}

                    <div className="space-y-4 border-t pt-4 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-base">
                                    የጀመሩበት ቀን <span className="text-secondary-foreground">({stats.startSlotLabel} ላይ)</span>
                                </span>
                            </div>
                            <span className="text-base font-medium">{activeContract && getFullDate(activeContract?.startDate)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-base">
                                    የሚያበቃበት ቀን <span className="text-secondary-foreground">({stats.finishSlotLabel} ላይ)</span>
                                </span>
                            </div>
                            <span className="text-base font-medium">{activeContract && getFullDate(stats.dynamicEndDate.toISOString())}</span>
                        </div>
                    </div>

                    <div className="space-y-3 rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-lg font-medium">
                                <Wallet className="size-4" /> ክፍያ
                            </span>
                            <span className={cn("text-lg font-bold", stats.paymentStatusColor)}>
                                {activeContract && activeContract.paidAmount >= 5000
                                    ? "ሙሉ ተከፍሏል"
                                    : `${5000 - (activeContract?.paidAmount || 0)} ብር ቀሪ`}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                placeholder="ክፍያ መጠን"
                                value={paymentInput}
                                onChange={(e) => setPaymentInput(e.target.value)}
                                className="h-9"
                            />
                            <Button size="sm" className="h-9 text-base" onClick={handleUpdatePayment} disabled={!paymentInput || !activeContract}>
                                ክፍያ ፈጽም
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <MealButton
                            label="ቁርስ / ምሳ"
                            isDone={stats.hasEatenSlot1}
                            disabled={!activeContract || stats.isExpired || loading}
                            onClick={() => handleLogMeal("slot1")}
                        />
                        <MealButton
                            label="እራት"
                            isDone={stats.hasEatenSlot2}
                            disabled={!activeContract || stats.isExpired || loading}
                            onClick={() => handleLogMeal("slot2")}
                        />
                    </div>

                    <div className="flex items-center justify-between border-t pt-4">
                        <DeleteAlertDialog customerName={customer.name} onDelete={handleDelete} />
                        <RenewContractDialog customerName={customer.name} onRenew={handleRenew} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MealButton({ label, isDone, onClick, disabled }: { label: string; isDone: boolean; onClick: () => void; disabled: boolean }) {
    return (
        <Button
            variant={isDone ? "default" : "outline"}
            onClick={onClick}
            disabled={isDone || disabled}
            className={cn(
                "disabled:text-foreground h-16 w-full justify-between px-4 disabled:opacity-100",
                isDone && "bg-green-600 opacity-100 hover:bg-green-600",
            )}
        >
            <div className="flex items-center gap-3">
                <Utensils className={cn("size-5", isDone ? "text-white" : "text-muted-foreground")} />
                <div className="text-left">
                    <p className="text-xl leading-none font-bold">{label}</p>
                    <p className={cn("mt-1 opacity-70", isDone ? "block" : "hidden")}>{isDone ? "በልቷል / በልታለች" : ""}</p>
                </div>
            </div>
            {isDone && <Check className="size-5" />}
        </Button>
    );
}
