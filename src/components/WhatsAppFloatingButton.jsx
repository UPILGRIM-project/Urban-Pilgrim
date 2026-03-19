import { FaWhatsapp } from "react-icons/fa";
import { trackEvent } from "../utils/metaPixel";

export default function WhatsAppFloatingButton() {
    const phoneNumber = "7888399232"; // replace with your actual number
    const message = "Hey there";

    return (
        <a
            href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("Contact", { method: "WhatsApp" })}
            className="fixed bottom-5 right-5 z-50 bg-[#2ac270] p-3 rounded-full shadow-lg transition-all duration-300"
        >
            <FaWhatsapp className="text-white md:size-10 size-8 duration-200 " />
        </a>
    );
}
