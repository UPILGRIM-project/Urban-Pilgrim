import { useState } from "react";
import { motion } from "framer-motion";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";

const initialData = [
  {
    id: "#PR-1001",
    email: "user1@example.com",
    mode: "Online",
    persons: 1,
    date: "2023-11-15",
    location: "-",
  },
  {
    id: "#PR-1002",
    email: "user2@example.com",
    mode: "Offline",
    persons: 2,
    date: "2023-11-15",
    location: "Address: 123 Temple Road, Location: Varanasi, UP",
  },
  {
    id: "#PR-1003",
    email: "user3@example.com",
    mode: "Online",
    persons: 3,
    date: "2023-11-15",
    location: "-",
  },
  {
    id: "#PR-1004",
    email: "user4@example.com",
    mode: "Offline",
    persons: 5,
    date: "2023-11-15",
    location: "Address: 123 Temple Road, Location: Varanasi, UP",
  },
  {
    id: "#PR-1005",
    email: "user5@example.com",
    mode: "Online",
    persons: 1,
    date: "2023-11-15",
    location: "-",
  },
];

export default function GuideBookingsTable() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookings, setBookings] = useState(initialData);

  const filtered = bookings.filter((b) => {
    const matchesSearch = b.email.toLowerCase().includes(search.toLowerCase());
    const matchesMode = filter === "All" || b.mode === filter;

    const bookingTime = new Date(b.date).getTime();
    let matchesDateRange = true;
    if (startDate) matchesDateRange = matchesDateRange && bookingTime >= new Date(startDate).getTime();
    if (endDate) matchesDateRange = matchesDateRange && bookingTime <= new Date(endDate).getTime();

    return matchesSearch && matchesMode && matchesDateRange;
  });

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-[#2F6288] mb-4">
        Pilgrim Guide Bookings <span className="bg-[#2F6288] mt-1 w-20 h-1 block"></span>
      </h2>

      {/* Filters */}
      <div className="flex flex-col xl:flex-row gap-3 mb-4">
        <div className="flex flex-col md:flex-row gap-3 flex-shrink-0">
          <label className="text-sm flex flex-col md:flex-row md:items-center gap-2 text-nowrap">
            Mode:
            <select
              className="border p-2 rounded w-full md:w-auto"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All</option>
              <option>Online</option>
              <option>Offline</option>
            </select>
          </label>

          <label className="text-sm flex flex-col md:flex-row md:items-center gap-2 text-nowrap">
            Date range:
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                className="border p-2 rounded"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="self-center">to</span>
              <input
                type="date"
                className="border p-2 rounded"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by email or name..."
            className="border p-2 rounded w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table for desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border rounded overflow-hidden">
          <thead className="bg-[#E8F0F6] text-[#2F6288] text-left">
            <tr>
              <th className="p-2">Booking ID</th>
              <th className="p-2">User Email</th>
              <th className="p-2">Mode</th>
              <th className="p-2">Persons per Session</th>
              <th className="p-2">Booking Date</th>
              <th className="p-2">Location Details</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((booking, idx) => (
              <motion.tr
                key={idx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="bg-gray-50 border-b"
              >
                <td className="p-2">{booking.id}</td>
                <td className="p-2">{booking.email}</td>
                <td className="p-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      booking.mode === "Online"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {booking.mode}
                  </span>
                </td>
                <td className="p-2">{booking.persons}</td>
                <td className="p-2">{booking.date}</td>
                <td className="p-2">{booking.location}</td>
                <td className="p-2 flex items-center gap-2">
                  <button className="text-blue-600 hover:text-blue-800">
                    <FaEye />
                  </button>
                  <button className="text-green-600 hover:text-green-800">
                    <FaEdit />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => {
                      const updated = bookings.filter((_, i) => i !== idx);
                      setBookings(updated);
                    }}
                  >
                    <FaTrash />
                  </button>
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Card view for mobile */}
      <div className="md:hidden space-y-4">
        {filtered.map((booking, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.05 }}
            className="border rounded-lg p-4 shadow-sm"
          >
            <div className="flex justify-between">
              <p className="font-semibold">{booking.id}</p>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  booking.mode === "Online"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {booking.mode}
              </span>
            </div>
            <p className="text-sm text-gray-600">{booking.email}</p>
            <p className="mt-1 text-sm">{booking.location}</p>
            <p className="text-xs text-gray-500 mt-1">
              {booking.persons} persons | {booking.date}
            </p>
            <div className="flex gap-3 mt-3">
              <button className="text-blue-600 hover:text-blue-800">
                <FaEye />
              </button>
              <button className="text-green-600 hover:text-green-800">
                <FaEdit />
              </button>
              <button
                className="text-red-600 hover:text-red-800"
                onClick={() => {
                  const updated = bookings.filter((_, i) => i !== idx);
                  setBookings(updated);
                }}
              >
                <FaTrash />
              </button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500">No bookings found.</p>
        )}
      </div>
    </div>
  );
}
