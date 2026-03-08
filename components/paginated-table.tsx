import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dispatch, SetStateAction } from "react";

interface PaginationProp {
    setCurrentPage: Dispatch<SetStateAction<number>>;
    currentPage: number;
    totalPages: number;
}

export default function PaginatedTable({ currentPage, totalPages, setCurrentPage }: PaginationProp) {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const showMax = 7;

        if (totalPages < showMax) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);

            if (currentPage > 3) pages.push("ellipsis-start");

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) if (!pages.includes(i)) pages.push(i);

            if (currentPage < totalPages - 2) pages.push("ellipsis-end");

            if (!pages.includes(totalPages)) pages.push(totalPages);
        }

        return pages;
    };

    const pages = getPageNumbers();

    return (
        <Pagination className="mt-auto mb-4">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious className={currentPage === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"} onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} />
                </PaginationItem>

                {pages.map((page, index) =>
                    page === "ellipsis-start" || page === "ellipsis-end" ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={page}>
                            <PaginationLink isActive={currentPage === page} onClick={() => setCurrentPage(Number(page))} className={`${currentPage === page ? "border-zinc-400" : ""} cursor-pointer`}>
                                {page}
                            </PaginationLink>
                        </PaginationItem>
                    ),
                )}

                <PaginationItem>
                    <PaginationNext className={currentPage === totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"} onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
