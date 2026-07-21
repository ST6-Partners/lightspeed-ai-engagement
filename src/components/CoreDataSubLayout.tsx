// ============================================================
// CORE DATA · SUB-PAGE LAYOUT
// Wraps every /core-data/* sub-page with a "back to Core Data"
// link so users can return to the hub. Renders the sub-page via
// <Outlet />. Keeps the 11 page components untouched.
// ============================================================

import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function CoreDataSubLayout() {
  return (
    <div>
      <Link
        to="/core-data"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ls-ink-3 hover:text-ls-blue-deep transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Core Data
      </Link>
      <Outlet />
    </div>
  );
}
