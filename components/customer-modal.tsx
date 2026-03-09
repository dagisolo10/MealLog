"use client";
import { SyntheticEvent, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { db } from "@/lib/db";
import { Field, FieldGroup } from "./ui/field";
import { EthiopianDatePicker } from "./day-picker";

export default function CustomerModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);

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
                isActive: true,
                synced: false,
                endDate: endDate.toDateString(),
            });

            setOpen(false);
            setStartDate(undefined);
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
                            <Input placeholder="Customer name" name="name" />
                        </Field>

                        <Field>
                            <Label>Start Date</Label>
                            <EthiopianDatePicker date={startDate} setDate={setStartDate} />
                        </Field>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Create Customer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
