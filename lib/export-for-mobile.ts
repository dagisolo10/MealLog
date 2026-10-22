import { db, Customer, Contract, MealLog } from "@/lib/db";

export interface MobileExportData {
    version: string;
    mealLogs: Array<MealLog & { timestamp: string }>;
    settings: any[];
    saleItems: any[];
    customers: Customer[];
    contracts: Contract[];
    dailySales: any[];
    exportedAt: string;
}

export async function exportForMobile(): Promise<MobileExportData> {
    const customers = await db.customers.toArray();
    const contracts = await db.contracts.toArray();
    const mealLogs = await db.mealLogs.toArray();

    return {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        customers: customers.map((customer) => ({ ...customer })),
        contracts: contracts.map((contract) => ({ ...contract })),
        mealLogs: mealLogs.map((log) => ({
            ...log,
            timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString(),
        })),
        settings: [],
        saleItems: [],
        dailySales: [],
    };
}

export async function downloadMobileExport(): Promise<void> {
    const data = await exportForMobile();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meal-log-mobile-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
