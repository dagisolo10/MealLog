"use client";
import CustomerTable from "@/components/customer-table";
import { getFullDate } from "@/lib/helper-functions";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import EmptyState from "@/components/empty-state";
import CustomerModal from "@/components/customer-modal";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
    const customers = useLiveQuery(() => db.customers.toArray()) || [];

    return (
        <main className="flex flex-col">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <p className="text-muted-foreground text-sm font-medium tracking-wider uppercase">Today</p>
                    <p className="text-xl font-medium">{getFullDate(new Date().toDateString())}</p>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <CustomerModal />
                </div>
            </div>

            {customers.length > 0 ? <CustomerTable customers={customers} /> : <EmptyState />}
        </main>
    );
}
