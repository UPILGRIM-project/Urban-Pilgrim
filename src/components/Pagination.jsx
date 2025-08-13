import React, { useState } from "react";

function Pagination({ totalPages }) {
  const [currentPage, setCurrentPage] = useState(1);

  const getPageNumbers = () => {
    const pages = [];

    let left = currentPage - 1;
    let right = currentPage + 1;

    if (left < 1) {
      left = 1;
      right = Math.min(3, totalPages);
    }

    if (right > totalPages) {
      right = totalPages;
      left = Math.max(totalPages - 2, 1);
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Previous Button */}
      <button
        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        disabled={currentPage === 1}
        className="px-2 py-0.5 sm:px-3 sm:py-1 text-sm sm:text-base rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
      >
        &lt;
      </button>

      {/* Page Buttons */}
      {pageNumbers.map((page) => (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-md text-sm sm:text-base ${
            page === currentPage
              ? "bg-[#C16A00] text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          {page}
        </button>
      ))}

      {/* Next Button */}
      <button
        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-2 py-0.5 sm:px-3 sm:py-1 text-sm sm:text-base rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
      >
        &gt;
      </button>
    </div>
  );
}

export default Pagination;
