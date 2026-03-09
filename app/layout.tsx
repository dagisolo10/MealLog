import type { Metadata } from "next";
import { Manrope, Playfair_Display, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import ServiceRegister from "@/components/service-register";
import "./globals.css";
import UpdateNotification from "@/components/update-notification";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: "400" });

export const metadata: Metadata = {
    title: {
        default: "MealLog | Contract Management",
        template: "%s | MealLog",
    },
    icons: {
        icon: "/favicon.ico",
    },
    description: "Track student and professional meal contracts. Manage lunch and dinner check-ins with automated expiry tracking.",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "MealLog",
    },
    formatDetection: {
        telephone: false,
    },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className="dark">
            <body className={`${manrope.variable} ${poppins.variable} ${playfair.variable} antialiased`}>
                <ServiceRegister />
                <main className="mx-auto max-w-11/12 py-12 pb-24">{children}</main>
                <UpdateNotification />
                <Toaster position="top-center" />
            </body>
        </html>
    );
}
