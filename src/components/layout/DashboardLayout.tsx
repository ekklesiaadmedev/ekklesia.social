import React from "react";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, className }) => {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-muted/40">
      <main className={cn("container max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8", className)}>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;