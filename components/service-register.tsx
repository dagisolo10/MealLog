"use client";
import { useEffect } from "react";

export default function ServiceRegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/service-worker.js")
                .then((reg) => console.log("Success", reg.scope))
                .catch((err) => console.log("Failure", err));
        }

        const handleOnline = () => console.log("I came back Online");
        const handleOffline = () => console.log("I am Offline");

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return null;
}
