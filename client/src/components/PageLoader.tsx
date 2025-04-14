import React from "react";
import { Loader2 } from "lucide-react";

/**
 * A lightweight loading component to display during lazy loading of pages
 */
const PageLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-50">
      <div className="w-14 h-14">
        <Loader2 className="w-full h-full text-primary animate-spin" />
      </div>
      <p className="mt-4 text-sm text-slate-600">로딩 중...</p>
    </div>
  );
};

export default PageLoader;