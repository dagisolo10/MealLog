"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";

export default function UpdateNotification() {
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [showUpdate, setShowUpdate] = useState(false);

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
                setRegistration(reg);

                if (reg.waiting) setShowUpdate(true);

                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    newWorker?.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) setShowUpdate(true);
                    });
                });
            });

            const checkUpdate = () => navigator.serviceWorker.getRegistration().then((reg) => reg?.update());

            window.addEventListener("focus", checkUpdate);
            return () => window.removeEventListener("focus", checkUpdate);
        }
    }, []);

    const handleUpdate = () => {
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });

            navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
        }
    };

    if (!showUpdate) return null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 fixed right-6 bottom-6 z-100 duration-500">
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/80 p-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                        <Sparkles className="size-4" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Update Ready</p>
                        <p className="text-[10px] text-white/50">New features are waiting for you.</p>
                    </div>
                </div>

                <Button onClick={handleUpdate} size="sm" className="w-full bg-blue-600 font-bold transition-all hover:bg-blue-700 active:scale-95">
                    <RefreshCw className="animate-spin-slow mr-2 size-3" />
                    Update Now
                </Button>
            </div>
        </div>
    );
}
