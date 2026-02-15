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
    <Breadcrumb className={cn("text-muted-foreground", className)}>
      <BreadcrumbList className="flex-wrap gap-1.5 sm:gap-2.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator className="text-muted-foreground/70" />}
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="text-foreground font-medium">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.href} className="hover:text-foreground transition-colors">
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
