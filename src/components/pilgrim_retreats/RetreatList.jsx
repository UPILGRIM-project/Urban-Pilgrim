import RetreatCard from "./RetreatCard";

const retreats = [
  {
    title: "Reboot & Rejuvenate in the Himalayas (4 day retreat)",
    location: "Bhubaneswar, Odisha",
    price: "74,999.00",
    image: "https://picsum.photos/200",
  },
  {
    title: "Soul reboot on the Ganges (4 day retreat)",
    location: "Bhubaneswar, Odisha",
    price: "74,999.00",
    image: "https://picsum.photos/200",
  },
];

export default function RetreatList() {
  return (
    <div className="md:flex md:flex-wrap grid sm:grid-cols-2 gap-8 px-6 py-4 pt-10 md:pt-4 ">
      {retreats.map((retreat, index) => (
        <RetreatCard key={index} {...retreat} />
      ))}
    </div>
  );
}
