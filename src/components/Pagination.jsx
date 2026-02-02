/**
 * @fileoverview Pagination Component
 *
 * Reusable pagination controls
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './AdvancedSearch.css';

export default function Pagination({
    currentPage,
    totalPages,
    totalResults,
    itemsPerPage,
    onPageChange,
    onPrevPage,
    onNextPage
}) {
    if (totalPages <= 1) {
        return null;
    }

    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalResults);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        const showPages = 5; // Number of page buttons to show

        if (totalPages <= showPages) {
            // Show all pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show pages around current page
            let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
            let endPage = Math.min(totalPages, startPage + showPages - 1);

            if (endPage - startPage < showPages - 1) {
                startPage = Math.max(1, endPage - showPages + 1);
            }

            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push('...');
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="pagination-container">
            {/* Results Info */}
            <div className="pagination-info">
                Showing <span className="pagination-info-number">{startItem}</span> to{' '}
                <span className="pagination-info-number">{endItem}</span> of{' '}
                <span className="pagination-info-number">{totalResults}</span> results
            </div>

            {/* Page Controls */}
            <div className="pagination-controls">
                {/* First Page */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                    title="First page"
                >
                    <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                    onClick={onPrevPage}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                    title="Previous page"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers */}
                <div className="pagination-numbers">
                    {pageNumbers.map((page, index) => (
                        page === '...' ? (
                            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                                ...
                            </span>
                        ) : (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                            >
                                {page}
                            </button>
                        )
                    ))}
                </div>

                {/* Next Page */}
                <button
                    onClick={onNextPage}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                    title="Next page"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                    title="Last page"
                >
                    <ChevronsRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
