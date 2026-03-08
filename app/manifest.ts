import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "MealLog: Smart Contract Tracker",
        short_name: "MealLog",
        description: "Efficiently manage and track meal contracts for students and professionals.",
        start_url: "/",
        background_color: "#000000",
        theme_color: "#000000",
        display: "standalone",
        icons: [
            {
                src: "/food-icon/android-chrome-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/food-icon/android-chrome-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
        screenshots: [
            {
                src: "/food-icon/mobile.jpg",
                sizes: "1080x2072",
                type: "image/jpeg",
            },
            {
                src: "/food-icon/desktop.png",
                sizes: "1920x1080",
                type: "image/png",
                form_factor: "wide",
            },
        ],
    };
}
