"use client";
import { SyntheticEvent, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, MealSlot } from "@/lib/db";
import { Field, FieldGroup } from "./ui/field";
import { EthiopianDatePicker } from "./day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { addDays } from "date-fns";

export default function CustomerModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [startSlot, setStartSlot] = useState<string>("slot1");

    async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const payload = Object.fromEntries(formData);

        if (!String(payload.name).trim() || !startDate) return;
        setLoading(true);

        const endDate = addDays(startDate, 30);

        try {
            const customerId = await db.customers.add({
                name: String(payload.name).trim(),
            });

            await db.contracts.add({
                customerId: customerId as number,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                startSlot: startSlot as MealSlot,
                paidAmount: Number(payload.paid) || 0,
                status: "active",
            });

            setOpen(false);
            setStartDate(new Date());
            setStartSlot("slot1");
        } catch (err) {
            console.error("Failed to add customer and contract:", err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="text-base font-semibold shadow-sm">
                    <Plus className="size-4" />
                    ደንበኛ መዝግብ
                </Button>
            </DialogTrigger>

            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>Add Customer</DialogTitle>
                        <DialogDescription>Create a new customer and start 60-meal contract.</DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <Field>
                            <Label className="text-lg">የደንበኘ ስም</Label>
                            <Input name="name" required />
                        </Field>

                        <Field>
                            <Label className="text-lg">መጀመሪያ ቀን</Label>
                            <EthiopianDatePicker date={startDate} setDate={setStartDate} />
                        </Field>

                        <FieldGroup className="flex-row items-center gap-4">
                            <Field className="flex-1">
                                <Label className="text-lg">ቅድመ ክፍያ</Label>
                                <Input placeholder="0.00" name="paid" type="number" required />
                            </Field>

                            <Field className="flex-1">
                                <Label className="text-lg">የመጀሪያ ምግብ</Label>
                                <Select value={startSlot} onValueChange={setStartSlot}>
                                    <SelectTrigger className="text-lg">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem className="text-lg" value="slot1">
                                            ምሳ
                                        </SelectItem>
                                        <SelectItem className="text-lg" value="slot2">
                                            እራት
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </FieldGroup>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full text-xl">
                            {loading && <Loader2 className="size-4 animate-spin" />}
                            መዝግብ
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
