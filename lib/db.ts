import Dexie, { EntityTable } from "dexie";

export type MealSlot = "slot1" | "slot2";

export interface Customer {
    id?: number;
    name: string;
}

export interface Contract {
    id?: number;
    customerId: number;
    startDate: string;
    endDate: string;
    startSlot: MealSlot;
    paidAmount: number;
    debt?: number;
    status: "active" | "completed";
}

export interface MealLog {
    id?: number;
    customerId: number;
    contractId: number;
    logDate: string;
    slot: MealSlot;
    timestamp: Date;
}

export const db = new Dexie("MealDatabase") as Dexie & {
    customers: EntityTable<Customer, "id">;
    contracts: EntityTable<Contract, "id">;
    mealLogs: EntityTable<MealLog, "id">;
};

db.version(1).stores({
    customers: "++id, name",
    contracts: "++id, customerId, startDate, status",
    mealLogs: "++id, customerId, contractId, logDate, slot, [customerId+logDate+slot]",
});
db.version(2)
    .stores({
        customers: "++id, name",
        contracts: "++id, customerId, startDate, status, debt",
        mealLogs: "++id, customerId, contractId, logDate, slot, [customerId+logDate+slot]",
    })
    .upgrade(async (trx) => {
        const contracts = await trx.table("contracts").toArray();
        const updated = contracts.map((contract) => ({ ...contract, debt: 0 }));
        await trx.table("contracts").bulkPut(updated);
    });
