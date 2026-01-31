import React from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type BreadcrumbItemType = { label: string; href?: string };

interface PageBreadcrumbsProps {
  items: BreadcrumbItemType[];
  className?: string;
}

/**
 * Renders breadcrumb navigation. Last item without href is the current page.
 * Example: [ { label: "Dashboard", href: "/dashboard" }, { label: "Contacts", href: "/contacts" }, { label: "John Smith" } ]
 */
export function PageBreadcrumbs({ items, className }: PageBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <Breadcrumb className={cn("text-white/70", className)}>
      <BreadcrumbList className="flex-wrap gap-1.5 sm:gap-2.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator className="text-white/40" />}
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="text-white font-medium">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.href} className="hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
