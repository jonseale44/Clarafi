import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { useNavigationContext } from "@/hooks/use-navigation-context";

interface NavigationBreadcrumbProps {
  className?: string;
}

export function NavigationBreadcrumb({ className = "" }: NavigationBreadcrumbProps) {
  const { navContext, goBack, clearContext, hasContext } = useNavigationContext();

  if (!hasContext || !navContext) {
    return null;
  }

  return (
    <div className={`bg-navy-blue-50 border-b border-navy-blue-200 px-4 py-2 flex items-center justify-between ${className}`} data-median="mobile-navigation-breadcrumb">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="text-navy-blue-700 hover:text-navy-blue-900 hover:bg-navy-blue-100 h-8 px-3"
          data-median="mobile-back-button"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {navContext.contextLabel}
        </Button>
        
        <div className="text-sm text-navy-blue-600 hidden sm:block" data-median="hide-on-mobile-app">
          Viewing document from: <span className="font-medium">{navContext.contextLabel}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2" data-median="hide-on-mobile-app">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearContext}
          className="text-navy-blue-600 hover:text-navy-blue-800 hover:bg-navy-blue-100 h-7 px-2"
          title="Clear navigation context and stay here"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Clear navigation context</span>
        </Button>
      </div>
    </div>
  );
}