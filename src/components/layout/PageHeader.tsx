import { ReactNode, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type Crumb = { label: string; to?: string };

type PageHeaderProps = {
  title: string;
  description?: string;
  backTo?: string;
  breadcrumbItems?: Crumb[];
  actions?: ReactNode;
};

export const PageHeader = ({ title, description, backTo, breadcrumbItems, actions }: PageHeaderProps) => {
  const navigate = useNavigate();
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {backTo && (
          <Button onClick={() => navigate(backTo)} variant="outline" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          {breadcrumbItems && breadcrumbItems.length > 0 && (
            <div className="mb-2">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbItems.map((c, idx) => (
                    <Fragment key={`crumb-${idx}`}>
                      <BreadcrumbItem>
                        {c.to ? (
                          <BreadcrumbLink href={c.to}>{c.label}</BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{c.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {idx < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          )}
          <h1 className="text-4xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
};

export default PageHeader;