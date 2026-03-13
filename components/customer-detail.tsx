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
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [paymentInput, setPaymentInput] = useState("");
    const [debt, setDebt] = useState("");
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
        setOpen(false);
    };

    const handleDebtDecrement = async () => {
        if (!activeContract || !debt) return;
        const newAmount = Math.max((activeContract.debt || 0) - Number(debt), 0);
        await db.contracts.update(activeContract.id!, { debt: newAmount });
        setDebt("");
        setOpen(false);
    };

    const handleDebtIncrement = async () => {
        if (!activeContract || !debt) return;
        const newAmount = (activeContract.debt || 0) + Number(debt);
        await db.contracts.update(activeContract.id!, { debt: newAmount });
        setDebt("");
        setOpen(false);
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="top-[50%]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
                    <div className="mt-2 flex items-center gap-2">
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
                        <div className="bg-muted/20 inset-ring-card flex justify-between rounded-xl border px-4 py-2 text-center">
                            <p className="font-black">{stats.totalEaten}</p>
                            <p className="text-muted-foreground font-bold uppercase">በልተዋል</p>
                        </div>
                        <div
                            className={cn(
                                "inset-ring-card flex justify-between rounded-xl border px-4 py-2 text-center",
                                stats.isExpired ? "bg-red-50" : "bg-muted/20",
                            )}
                        >
                            <p className={cn("font-black", stats.statusColor)}>{stats.mealsLeft}</p>
                            <p className="text-muted-foreground font-bold uppercase">ቀሪ</p>
                        </div>
                    </div>

                    {(stats.isExpired || stats.isOverEaten) && (
                        <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-3 font-bold">
                            <AlertCircle className="size-4" />
                            {stats.isOverEaten ? "Limit Exceeded!" : "ኮርትራቱ አልቋል"}
                        </div>
                    )}

                    <div className="space-y-4 border-t pt-4 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                    የጀመሩበት ቀን <span className="text-secondary-foreground">({stats.startSlotLabel} ላይ)</span>
                                </span>
                            </div>
                            <span className="font-medium">{activeContract && getFullDate(activeContract?.startDate)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                    የሚያበቃበት ቀን <span className="text-secondary-foreground">({stats.finishSlotLabel} ላይ)</span>
                                </span>
                            </div>
                            <span className="font-medium">{activeContract && getFullDate(stats.dynamicEndDate.toISOString())}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-3 rounded-xl border p-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 font-medium">
                                    <Wallet className="size-4" /> ክፍያ
                                </span>
                                <span className={cn("font-bold", stats.paymentStatusColor)}>
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

                        <div className="space-y-3 rounded-xl border p-4">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 font-medium">
                                    <Wallet className="size-4" /> ዱቤ
                                </span>
                                <span className={cn("font-bold", (stats?.debt || 0) > 0 ? "text-red-500" : "text-emerald-500")}>
                                    {activeContract && activeContract.debt && activeContract?.debt <= 0
                                        ? "ዱቤ የለም"
                                        : `${activeContract?.debt || 0} ብር ዱቤ ቀሪ`}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <Button size="sm" className="text-foreground h-9 bg-red-500/70 text-base" onClick={handleDebtIncrement}>
                                    ዱቤ ጨምር
                                </Button>
                                <Input type="number" placeholder="ዱቤ መጠን" value={debt} onChange={(e) => setDebt(e.target.value)} className="h-9" />
                                <Button
                                    size="sm"
                                    className="text-foreground h-9 bg-emerald-500 text-base"
                                    onClick={handleDebtDecrement}
                                    disabled={stats.debt === 0 || !activeContract}
                                >
                                    ዱቤ ክፈል
                                </Button>
                            </div>
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
