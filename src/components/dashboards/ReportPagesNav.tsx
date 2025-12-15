import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportPage {
  name: string;
  displayName: string;
  isActive?: boolean;
}

interface ReportPagesNavProps {
  pages: ReportPage[];
  currentPage: string;
  onPageChange: (pageName: string) => void;
}

export const ReportPagesNav = ({
  pages,
  currentPage,
  onPageChange,
}: ReportPagesNavProps) => {
  const [open, setOpen] = useState(false);

  const currentPageDisplay = pages.find(p => p.name === currentPage)?.displayName || currentPage;

  if (pages.length <= 1) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <FileText className="h-3 w-3" />
          <span className="max-w-[100px] truncate">{currentPageDisplay}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[300px] overflow-auto">
        {pages.map((page) => (
          <DropdownMenuItem
            key={page.name}
            onClick={() => {
              onPageChange(page.name);
              setOpen(false);
            }}
            className={cn(
              "flex items-center gap-2",
              page.name === currentPage && "bg-muted"
            )}
          >
            {page.name === currentPage && (
              <Check className="h-4 w-4 text-primary" />
            )}
            <span className={cn(page.name !== currentPage && "ml-6")}>
              {page.displayName}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
