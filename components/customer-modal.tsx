// "use client";
// import { useState } from "react";
// import { Plus, Loader2 } from "lucide-react";
// import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "./ui/dialog";
// import { Button } from "./ui/button";

// export default function CustomerModal() {
//     const [loading] = useState(false);

//     return (
//         <Dialog>
//             <DialogTrigger asChild>
//                 <Button className="font-semibold shadow-sm">
//                     <Plus className="size-4" /> Add Customer
//                 </Button>
//             </DialogTrigger>

//             <DialogContent className="sm:max-w-125">
//                 <form>
//                     <DialogHeader className="relative border-b border-zinc-100 pb-5 dark:border-zinc-800"></DialogHeader>

//                     <DialogFooter className="gap-4">
//                         <Button disabled={loading}>
//                             {loading && <Loader2 className="size-4 animate-spin" />}
//                             Create Vendor
//                         </Button>
//                     </DialogFooter>
//                 </form>
//             </DialogContent>
//         </Dialog>
//     );
// }

"use client";

import { SyntheticEvent, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { db } from "@/lib/db";
import { Field, FieldGroup } from "./ui/field";

export default function CustomerModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const payload = Object.fromEntries(formData);
        if (!String(payload.name).trim() || !String(payload.startDate).trim()) return;
        setLoading(true);

        const endDate = new Date(String(payload.startDate).trim());
        endDate.setDate(new Date(String(payload.startDate).trim()).getDate() + 30);

        try {
            await db.customers.add({
                name: String(payload.name).trim(),
                startDate: String(payload.startDate).trim(),
                isActive: true,
                synced: false,
                endDate: endDate.toDateString(),
            });

            setOpen(false);
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
                    </DialogHeader>

                    <FieldGroup>
                        <Field>
                            <Label>Name</Label>
                            <Input placeholder="Customer name" name="name" />
                        </Field>

                        <Field>
                            <Label>Start Date</Label>
                            <Input type="date" name="startDate" defaultValue={new Date().toISOString().split("T")[0]} />
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
