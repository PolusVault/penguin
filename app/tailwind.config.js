/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            animation: {
                enter: "enter 200ms ease-out",
                "slide-in": "slide-in 1.2s cubic-bezier(.41,.73,.51,1.02)",
                leave: "leave",
            },
            keyframes: {
                enter: {
                    "0%": { transform: "scale(0.9)", opacity: 0 },
                    "100%": { transform: "scale(1)", opacity: 1 },
                },
                leave: {
                    // "0%": { transform: "scale(1)", opacity: 1 },
                    // "100%": { transform: "scale(0.9)", opacity: 0 },
                },
                "slide-in": {
                    "0%": { transform: "translateY(-100%)" },
                    "100%": { transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
};
