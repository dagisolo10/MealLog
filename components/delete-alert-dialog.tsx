"use client";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteProps {
    customerName: string;
    onDelete: () => void;
}

export default function DeleteAlertDialog({ customerName, onDelete }: DeleteProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 border-destructive/40 h-9 w-fit justify-start gap-2 border text-lg"
                >
                    <Trash2 className="size-4" />
                    ደንበኛን ሰርዝ
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-xl">
                        <AlertTriangle className="text-destructive size-5" />
                        እርግጠኛ ነዎት?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="pt-2 text-base">
                        ይህ ድርጊት ሊመለስ አይችልም። ደንበኛን <span className="text-foreground font-bold">&quot;{customerName}&apos;</span> መረጃ እና ሙሉ ኮንትራት ታሪክ
                        ይጠፋል
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel>ይቅር</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        አጥፋ
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
