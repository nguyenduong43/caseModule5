import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class", // 🔥 Dòng này là "linh hồn" để Dark Mode hoạt động nè
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};
export default config;