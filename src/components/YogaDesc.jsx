import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function YogaDesc() {
    const location = useLocation();
    const image = location?.state?.image || "";
    const description = location?.state?.description || "";
    const title = location?.state?.title || "";

    useEffect(() => {   
        window.scrollTo(0, 0);
    }, []);

    return (
        <section className="relative max-w-7xl mt-20 mx-auto xl:px-0 lg:px-20 px-8 lg:py-10 py-3">
            {/* bg glow */}
            <div
                className="absolute -z-10 -top-32 -left-32 lg:-left-50
                        w-[300px] h-[300px]
                        md:w-[450px] md:h-[450px]
                        lg:w-[600px] lg:h-[600px]"
                style={{
                    borderRadius: "50%",
                    border: "1px solid #000",
                    background: "rgba(255, 121, 27, 0.35)",
                    filter: "blur(200px)",
                }}
            />

            {/* Title */}
            <h2 className="text-2xl md:text-2xl capitalize lg:text-4xl font-bold text-gray-900 leading-snug mb-8">
                {title}
            </h2>

            {/* Flex Container: Image Left, Content Right */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Image or Video - Left Side */}
                <div className="w-full lg:w-1/2 flex-shrink-0">
                    {(image?.includes('.mp4') || 
                        image?.includes('.mov') || 
                        image?.includes('.webm') || 
                        image?.includes('.avi') || 
                        image?.includes('.mkv')) ? (
                            <video
                                src={image}
                                controls
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="rounded-xl shadow-lg border border-gray-200 w-full h-[300px] md:h-[400px] lg:h-[500px] object-cover"
                            >
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <img
                                src={image}
                                alt={title}
                                className="rounded-xl shadow-lg border border-gray-200 w-full h-[300px] md:h-[400px] lg:h-[500px] object-cover"
                            />
                        )
                    }
                </div>

                {/* Description - Right Side */}
                <div 
                    className="w-full lg:w-1/2 text-gray-700 lg:text-base sm:text-sm text-xs leading-relaxed space-y-4 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: description || "" }}
                />
            </div>
        </section>
    );
}
