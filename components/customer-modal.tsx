"use client";
import { SyntheticEvent, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { db, MealSlot } from "@/lib/db";
import { Field, FieldGroup } from "./ui/field";
import { EthiopianDatePicker } from "./day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export default function CustomerModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [startSlot, setStartSlot] = useState<string>("slot1");

    async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const payload = Object.fromEntries(formData);

        if (!String(payload.name).trim() || !startDate) return;
        setLoading(true);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 30);

        try {
            await db.customers.add({
                name: String(payload.name).trim(),
                startDate: startDate.toISOString(),
                startSlot: startSlot as MealSlot,
                isActive: true,
                synced: false,
                endDate: endDate.toDateString(),
            });

            setOpen(false);
            setStartDate(undefined);
            setStartSlot("slot1");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="font-semibold shadow-sm">
                    <Plus className="size-4" />
                    Add Customer
                </Button>
            </DialogTrigger>

            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>Add Customer</DialogTitle>
                        <DialogDescription>Fill out the form below to add a new meal contract.</DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <Field>
                            <Label>Name</Label>
                            <Input placeholder="Customer name" name="name" required />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field>
                                <Label>Start Date</Label>
                                <EthiopianDatePicker date={startDate} setDate={setStartDate} />
                            </Field>

                            <Field>
                                <Label>First Meal</Label>
                                <Select value={startSlot} onValueChange={setStartSlot}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select meal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="slot1">Lunch</SelectItem>
                                        <SelectItem value="slot2">Dinner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Create Customer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
