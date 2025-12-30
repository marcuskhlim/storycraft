import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-roboto)", "sans-serif"],
            },
            colors: {
                background: {
                    DEFAULT: "#FAFAFB",
                    foreground: "#373F51",
                },
                foreground: "rgb(var(--foreground))",
                card: {
                    DEFAULT: "rgb(var(--card))",
                    foreground: "rgb(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "rgb(var(--popover))",
                    foreground: "rgb(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "#008DD5",
                    foreground: "#FFFFFF",
                },
                secondary: {
                    DEFAULT: "#373F51",
                    foreground: "#FFFFFF",
                },
                accent: {
                    DEFAULT: "#F56476",
                    foreground: "#FFFFFF",
                },
                muted: {
                    DEFAULT: "#EBEBEB",
                    foreground: "#373F51",
                },
                destructive: {
                    DEFAULT: "rgb(var(--destructive))",
                    foreground: "rgb(var(--destructive-foreground))",
                },
                border: "rgb(var(--border))",
                input: "rgb(var(--input))",
                ring: "rgb(var(--ring))",
                chart: {
                    "1": "rgb(var(--chart-1))",
                    "2": "rgb(var(--chart-2))",
                    "3": "rgb(var(--chart-3))",
                    "4": "rgb(var(--chart-4))",
                    "5": "rgb(var(--chart-5))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [tailwindcssAnimate],
};
export default config;
