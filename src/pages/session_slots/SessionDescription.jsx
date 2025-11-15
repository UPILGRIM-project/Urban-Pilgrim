import YouTubeVideoPlaylist from "../../components/sessions/VideoPlayerSection"
import SEO from "../../components/SEO.jsx";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";

const SessionDescription = () => {
    const params = useParams();
    const programId = params.programId;
    const [programData, setProgramData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Get recorded program data from Redux store
    const Data = useSelector((state) => state.pilgrimRecordedSession.recordedSessions);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    function normalizeSlug(str) {
        return str
            ?.toLowerCase()
            .trim()
            .replace(/\s/g, '-')   // replace EVERY space with a dash; do not collapse
    }

    useEffect(() => {
        if (Data && programId) {
            const program = Data.find(
                (program) =>
                    normalizeSlug(program?.recordedProgramCard?.title) === normalizeSlug(programId)
            );
            setProgramData(program || null);
            setLoading(false);
        } else {
            setLoading(false)
        }
    }, [Data, programId]);

    // Get videos from recordedVideo array (new data structure)
    const videos = programData?.recordedVideo || [];
    
    // Get program details from slides array
    const programSlides = programData?.slides || [];
    const programSchedule = programData?.programSchedule || [];
    
    // Get main program info from recordedProgramCard
    const programCard = programData?.recordedProgramCard || {};

    return (
        <div className=" bg-gradient-to-b from-[#FAF4F0] to-white mt-[100px]">
            <SEO
                title={`${programCard?.title || "Recorded Program"} | Urban Pilgrim`}
                description={programCard?.description || "Watch recorded program sessions designed to help you on your wellness journey."}
                keywords={`recorded program, wellness videos, ${programCard?.category}, ${programCard?.title}, urban pilgrim`}
                canonicalUrl={`/program/${programId}/slots`}
                ogType="video"
            />
            <div className="relative w-full ">
                <img
                    src="/retreats.svg"
                    alt="Program Header"
                    className="absolute inset-0 w-full h-full object-cover z-0 border-b-2 border-[#ffffff33]"
                />
                <div className="relative z-10 px-6 pt-10 pb-4 flex justify-between max-w-7xl mx-auto">
                    <div className="flex flex-col gap-2">
                        <p className="text-3xl text-[#2F6288] font-bold">
                            {programCard?.title || "Recorded Program"} 
                            <span className="bg-[#2F6288] mt-4 w-1/3 min-w-20 h-1 block"></span>
                        </p>
                        {programCard?.category && (
                            <span className="text-sm bg-[#2F6288] text-white px-3 py-1 rounded-full w-fit">
                                {programCard.category}
                            </span>
                        )}
                        {programCard?.days && (
                            <p className="text-lg text-[#2F6288] font-medium">
                                {programCard.days} Days Program • {programCard?.videos || videos.length} Videos
                            </p>
                        )}
                    </div>
                </div>
                <div className="bg-gradient-to-b from-white/10 via-white/60 to-[#FAF4F0] absolute -bottom-4 z-8 h-24 w-full"></div>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#FAF4F0] to-white px-4 pb-4 max-w-7xl mx-auto z-10 relative">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6288]"></div>
                        <span className="ml-3 text-gray-600">Loading videos...</span>
                    </div>
                ) : (
                    <div className="w-full">
                        {/* Program Description */}
                        {programCard?.description && (
                            <div className="mb-8 p-6 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-[#2F6288] mb-3">About This Program</h2>
                                <p className="text-gray-700 leading-relaxed">{programCard.description}</p>
                                {programCard?.price && (
                                    <div className="mt-4 flex items-center gap-4">
                                        <span className="text-2xl font-bold text-[#2F6288]">₹{Number(programCard.price).toLocaleString()}</span>
                                        {programCard?.totalprice && programCard.totalprice !== programCard.price && (
                                            <span className="text-lg text-gray-500 line-through">₹{Number(programCard.totalprice).toLocaleString()}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Program Schedule */}
                        {programSchedule.length > 0 && (
                            <div className="mb-8 p-6 bg-white rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold text-[#2F6288] mb-4">Program Schedule</h2>
                                <div className="space-y-3">
                                    {programSchedule.map((schedule, index) => (
                                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                            <h3 className="font-medium text-gray-900">{schedule.title}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Videos Section */}
                        {videos.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-600 text-lg font-medium">No videos available</p>
                                <p className="text-gray-500 text-sm mt-1">Check back later for new content</p>
                            </div>
                        ) : (
                            <YouTubeVideoPlaylist videos={videos} programData={programData} />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SessionDescription