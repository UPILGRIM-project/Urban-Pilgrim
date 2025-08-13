import SectionEight from "./SectionEight";
import SectionFive from "./SectionFive";
import SectionFour from "./SectionFour";
import SectionOne from "./SectionOne";
import SectionSeven from "./SectionSeven";
import SectionSix from "./SectionSix";
import SectionThree from "./SectionThree";
import SectionTwo from "./SectionTwo";

export default function TitleDescriptionEditor() {
  return (
    <>
      <div className="mx-auto p-6 rounded space-y-4">
        <h2 className="sm:text-2xl font-bold text-[#2F6288] text-xl">
          Title and Description <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
        </h2>

        <SectionOne />
        <SectionTwo />
        <SectionThree />
        <SectionFour />
        <SectionFive />
        <SectionSix />
        <SectionSeven />
        <SectionEight />
        
      </div>
    </>
  );
}
