import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:ml-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white print:text-black zoho-content-title">
          {title}
        </h1>
        {description != null && description !== "" && (
          <div className="text-sm mt-1 text-white/60 print:text-gray-600 zoho-content-muted [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 sm:gap-3 print:hidden">{actions}</div>}
    </div>
  );
}
