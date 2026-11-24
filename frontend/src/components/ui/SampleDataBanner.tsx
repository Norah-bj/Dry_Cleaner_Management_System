import { Info } from 'lucide-react';

/**
 * Marks a page that still shows sample data (its backend isn't built yet),
 * so nobody mistakes it for the shop's real records. Remove the banner in
 * the same change that connects the page to the API.
 */
export function SampleDataBanner({ what }: { what: string }) {
  return (
    <div role="note" className="mb-4 flex items-start gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        <strong>Preview only.</strong> {what} on this page are sample data and are not saved. This page is
        not connected to your records yet.
      </span>
    </div>
  );
}
