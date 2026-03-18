"use client";
import { Button } from "@/components/ui/button";
import { Info, Moon, RefreshCcw, Utensils } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { MealSlot } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { Field } from "./ui/field";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";

interface RenewContractDialogProps {
    customerName: string;
    onRenew: (startSlot: MealSlot) => Promise<void>;
    isHalf: boolean;
    setIsHalf: Dispatch<SetStateAction<boolean>>;
}

export default function RenewContractDialog({ customerName, onRenew, isHalf, setIsHalf }: RenewContractDialogProps) {
    const [selectedSlot, setSelectedSlot] = useState<MealSlot>("slot1");

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-primary text-primary h-9 gap-2 text-base">
                    <RefreshCcw className="size-4" /> አዲስ ኮንትራት ጀምር
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl">አዲስ ኮንትራት ይጀመር?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 pt-2 text-base">
                        ለ <span className="text-foreground font-bold">{customerName}</span> አዲስ የ60 ምግብ ኮንትራት ይጀመር እርግጠኛ ነዎት?
                    </AlertDialogDescription>
                    <div className="w-full space-y-4">
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => setSelectedSlot("slot1")}
                                className={cn("flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all", selectedSlot === "slot1" ? "border-primary bg-primary/10 text-primary" : "border-muted bg-transparent grayscale")}
                            >
                                <Utensils className="size-5" />
                                <span className="font-bold">ቁርስ / ምሳ</span>
                            </button>
                            <button
                                onClick={() => setSelectedSlot("slot2")}
                                className={cn("flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all", selectedSlot === "slot2" ? "border-primary bg-primary/10 text-primary" : "border-muted bg-transparent grayscale")}
                            >
                                <Moon className="size-5" />
                                <span className="font-bold">እራት</span>
                            </button>
                        </div>

                        <Field orientation={"horizontal"} className="my-4 flex items-center">
                            <Label className="flex-1 text-lg">ግማሽ ኮንትራት (በቀን አንዴ)</Label>
                            <Checkbox className="size-6" checked={isHalf} onCheckedChange={(checked) => setIsHalf(!!checked)} />
                        </Field>

                        <div className="bg-muted/50 text-foreground flex items-start gap-2 rounded-lg p-3 text-sm">
                            <Info className="text-primary mt-0.5 size-4" />
                            <p>ይህ ምርጫ የሚያበቃበትን ቀን ለማወቅ ወሳኝ ነው።</p>
                        </div>
                    </div>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ይቅር</AlertDialogCancel>

                    <AlertDialogAction onClick={() => onRenew(selectedSlot)} className="bg-primary hover:bg-primary/90">
                        አረጋግጥ
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
