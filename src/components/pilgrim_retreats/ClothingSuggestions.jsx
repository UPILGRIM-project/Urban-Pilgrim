import { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Loader2 from "../../components/Loader2"
import { showError } from "../../utils/toast"

const genAI = new GoogleGenerativeAI("AIzaSyC5vS7r9yDolUy4NJuuXSVvLDVweYZs7l0");

const ClothingSuggestions = ({ weather }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getClothing = async () => {
            if (!weather) return;
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Suggest 5 advisable clothing for: Temperature: ${weather.main.temp}°C, Condition: ${weather.weather[0].description} each in 5,6 words`;

            const maxRetries = 3;
            let attempt = 0;
            let backoff = 1000; // 1 second

            while (attempt < maxRetries) {
                try {
                    const result = await model.generateContent(prompt);
                    const text = await result.response.text();
                    const items = text
                        .split("\n")
                        .filter(line => line.trim() !== "")
                        .slice(1, 6)
                        .map(line =>
                            line
                                .replace(/^\d+\.\s*/, "")   // remove leading "1. ", "2. ", etc.
                                .replace(/\*\*/g, "")       // remove all bold markers **
                                .trim()
                        );
                    setSuggestions(items);
                    return;
                } catch (error) {
                    console.error("Gemini clothing error:", error);
                    attempt += 1;
                    if (attempt >= maxRetries) {
                        showError("Could not generate suggestions. Please try again later.");
                        return;
                    }
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    backoff *= 2; // exponential increase
                } finally {
                    setLoading(false);
                }
            }
        };

        getClothing();
    }, [weather]);

    if (loading) return <Loader2 />;

    return (
        <div className="p-6 md:w-1/2 w-full">
            <h4 className="text-lg font-bold mb-6">Recommended Clothing</h4>
            <ul className="space-y-4 text-sm text-gray-800">
                {suggestions.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <span className="relative flex h-4 w-4">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-[#F5E4D1] opacity-100"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C16A00] m-auto"></span>
                        </span>
                        <span className="font-medium">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ClothingSuggestions;