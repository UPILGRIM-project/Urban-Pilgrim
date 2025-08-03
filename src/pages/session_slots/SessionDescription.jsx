import YouTubeVideoPlaylist from "../../components/sessions/VideoPlayerSection"

const SessionDescription = () => {
  return (
    <div className=" bg-gradient-to-b from-[#FAF4F0] to-white mt-[100px]">
        <div className="relative w-full ">
            <img
            src="/retreats.svg"
            alt="Guides Header"
            className="absolute inset-0 w-full h-full object-cover z-0 border-b-2 border-[#ffffff33]"
            />
            <div className="relative z-10 px-6 pt-10 pb-4 flex justify-between max-w-7xl mx-auto">
                <p className="text-3xl text-[#2F6288] font-bold">
                    Discover your true self - A 28 day soul search journey with Rohini Singh Sisodia <span className="bg-[#2F6288] mt-4 w-1/3 min-w-20 h-1 block"></span>
                </p>
            </div>
            <div className="bg-gradient-to-b from-white/10 via-white/60 to-[#FAF4F0] absolute -bottom-4 z-8 h-24 w-full"></div>
        </div>
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#FAF4F0] to-white px-4 pb-4 max-w-7xl mx-auto z-10 relative">
            <YouTubeVideoPlaylist />
        </div>
    </div>
  )
}

export default SessionDescription