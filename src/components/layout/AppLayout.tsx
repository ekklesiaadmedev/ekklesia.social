import { ReactNode } from 'react';

export const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background/95 via-primary/10 to-secondary/10 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;