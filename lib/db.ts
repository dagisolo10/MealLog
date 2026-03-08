import Dexie, { EntityTable } from "dexie";

export type MealSlot = "slot1" | "slot2";

export interface Customer {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    synced: boolean;
}

export interface MealLog {
    id: number;
    customerId: number;
    logDate: string;
    slot: MealSlot;
    timestamp: Date;
    synced: boolean;
}

export const db = new Dexie("MealDatabase") as Dexie & {
    customers: EntityTable<Customer, "id">;
    mealLogs: EntityTable<MealLog, "id">;
};

db.version(1).stores({
    customers: "++id, name, startDate, endDate, isActive, synced",
    mealLogs: "++id, customerId, logDate, slot, timestamp, synced, [customerId+logDate], &[customerId+logDate+slot]",
});
