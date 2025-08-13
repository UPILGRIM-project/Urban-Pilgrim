import React, { useState } from "react";
import { FaSearch, FaChevronDown } from "react-icons/fa";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";
import { TbUserSquareRounded } from "react-icons/tb";
import { BsNut } from "react-icons/bs";
import { HiMenu } from "react-icons/hi";
import Pagination from "./Pagination";

const purchases = [
  {
    session: "Discover your true...",
    date: "12-06-2025",
    category: "Yoga, Meditation",
    price: 74999.0,
    status: "Completed",
  },
  {
    session: "Discover your true...",
    date: "12-06-2025",
    category: "Yoga",
    price: 74999.0,
    status: "Failed",
  },
];

const StatusBadge = ({ status }) => {
  const colors =
    status === "Completed"
      ? "bg-[#16C09824] text-[#008767] border border-[#008767]"
      : "bg-[#FFC5C580] text-[#DF0404] border border-[#DF0404]";

  return (
    <span
      className={`inline-flex items-center justify-center w-28 h-8 rounded text-sm font-medium ${colors}`}
    >
      {status}
    </span>
  );
};

function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fd]">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 bg-white shadow-lg flex flex-col justify-between
          transform transition-transform duration-300 ease-in-out z-40
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          w-full sm:w-[300px] lg:w-[256px]
          lg:translate-x-0 lg:static
        `}
      >
        {/* Mobile header with close button */}
        <div className="flex justify-between items-center p-4 border-b lg:hidden">
          <img src="/urban_pilgrim_logo.png" alt="Logo" className="h-10 w-10 rounded" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="p-2 hidden lg:block">
          <img
            src="/urban_pilgrim_logo.png"
            alt="Logo"
            className="mx-auto rounded h-16 w-16 sm:h-24 sm:w-24"
          />
        </div>

        <nav className="mt-6">
          <div className="flex items-center px-4 py-2 sm:px-6 sm:py-3 text-gray-700 font-bold text-sm sm:text-lg">
            <BsNut className="mr-2 text-base sm:text-xl" /> Dashboard
          </div>
          <div className="px-4 py-2">
            <button className="w-full flex items-center justify-between bg-[#C16A00] text-white font-semibold rounded-lg px-3 py-2 sm:px-4 sm:py-3 hover:bg-[#a85b00] transition-colors text-sm sm:text-base">
              <span className="flex items-center gap-2">
                <TbUserSquareRounded className="text-base sm:text-xl" /> Purchases
              </span>
              <IoIosArrowForward className="text-base sm:text-xl" />
            </button>
          </div>
        </nav>

        <div className="flex justify-between items-center p-4 sm:p-6 mt-auto">
          <div>
            <p className="text-gray-800 font-medium text-xs sm:text-sm">Evano</p>
            <p className="text-gray-500 text-[10px] sm:text-xs">evano@gmail.com</p>
          </div>
          <IoIosArrowDown className="text-gray-600 cursor-pointer text-base sm:text-xl" />
        </div>
      </aside>

      {/* Overlay for small screens */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
      {/* Heading + Search Bar */}
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
  {/* Mobile: hamburger + heading */}
  <div className="flex items-center gap-3 w-full lg:w-auto">
    <button
      className="p-2 rounded-md focus:outline-none focus:ring bg-white shadow lg:hidden"
      onClick={() => setSidebarOpen(true)}
    >
      <HiMenu className="w-6 h-6" />
    </button>
    <h1 className="text-xl font-semibold flex-1 text-center lg:text-left lg:text-2xl">
      Hello Evano 👋🏻,
    </h1>
  </div>

  {/* Search Bar */}
  <div className="flex items-center bg-white rounded-lg px-4 py-2 w-full lg:w-64 shadow-sm border border-gray-200">
    <FaSearch className="text-gray-400" />
    <input
      type="text"
      placeholder="Search"
      className="ml-2 flex-1 bg-transparent focus:outline-none focus:ring-0 text-sm placeholder-gray-400"
    />
  </div>
</div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex flex-col md:flex-col lg:flex-row justify-between gap-4">
            <div className="text-xl font-semibold text-nowrap text-center mt-2">
              Your Purchases
            </div>

            {/* Search + Sort */}
            <div className="flex flex-col md:flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center bg-[#f8f9fd] rounded-lg px-4 py-2 w-full lg:w-64 shadow-sm border border-gray-200">
                <FaSearch className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="ml-2 flex-1 bg-transparent focus:outline-none focus:ring-0 text-sm placeholder-gray-400"
                />
              </div>

              <div className="flex items-center justify-center bg-[#f8f9fd] rounded-lg px-4 py-2 cursor-pointer shadow-sm border border-gray-200 w-full lg:w-auto">
                <span className="text-sm">
                  Sort by: <b>Newest</b>
                </span>
                <FaChevronDown className="ml-2 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto text-nowrap mt-12">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead className="bg-white border-b">
                <tr className="text-[#B5B7C0]">
                  <th className="px-6 py-3 font-medium">Session Name</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{p.session}</td>
                    <td className="px-6 py-4">{p.date}</td>
                    <td className="px-6 py-4">{p.category}</td>
                    <td className="px-6 py-4 font-semibold">
                      ₹{" "}
                      {p.price.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3 px-2">
            <span className="text-[#B5B7C0] text-sm text-center sm:text-left">
              Showing data 1 to 8 of 256K entries
            </span>
            <Pagination totalPages={3} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
