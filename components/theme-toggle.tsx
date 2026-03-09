"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconBrightnessDownFilled, IconMoon } from "@tabler/icons-react";

export function ThemeToggle() {
    const { setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState<boolean>(false);
    const THEME_KEY = "y";

    useEffect(() => {
        const timer = requestAnimationFrame(() => setMounted(true));

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === THEME_KEY && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();

                setTheme(resolvedTheme === "dark" ? "light" : "dark");
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            cancelAnimationFrame(timer);
        };
    }, [mounted, resolvedTheme, setTheme]);

    if (!mounted) return <Button variant="ghost" size="icon" disabled />;

    return (
        <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} title="Toggle Theme (CTRL + Y)">
            {resolvedTheme === "dark" ? <IconBrightnessDownFilled className="size-5" /> : <IconMoon className="size-5" />}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
