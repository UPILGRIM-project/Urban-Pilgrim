import Button from "./ui/button/index.jsx";

function C8ContainerData() {
    return (
        <div className="md:w-screen sm:h-[50vh] h-[40vh] w-auto lg:h-auto relative">
            <div className="w-full h-full">
                <img src="/assets/bazar.svg" alt="none" className="w-full h-full object-cover object-center" />
            </div>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20
                w-full h-full flex flex-col items-center justify-center gap-7 bg-[rgba(24,76,116,0.3)] 
                rounded-[15px] backdrop-blur-[6.7px] border border-[rgba(255,255,255,0.6)] md:p-5 p-3 text-white 
                lg:max-w-[55%] sm:max-w-[70%] max-w-[90%] xl:max-h-[50%] md:max-h-[70%] max-h-[60%]"
            >
                <div className="flex flex-col items-center justify-between md:gap-5 gap-3 text-center">
                    <div className="lg:mb-2 text-[26px] lg:text-[35px] font-bold font-poppins">
                        <strong>Pilgrim Bazaar</strong>
                    </div>

                    <div className="sm:text-[16px] text-sm lg:text-[20px] font-medium font-poppins">
                        A soulful marketplace for spiritual, wellness, and heritage-inspired products
                    </div>

                    <div>
                        <Button btn_name={"Shop Now"} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default C8ContainerData;
