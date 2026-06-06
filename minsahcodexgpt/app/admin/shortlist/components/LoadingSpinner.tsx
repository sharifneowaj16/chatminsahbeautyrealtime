// app/admin/shortlist/components/LoadingSpinner.tsx & EmptyState.tsx
 
export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 font-medium">Loading shortlist data...</p>
      <p className="text-gray-500 text-sm mt-1">Please wait while we fetch your orders</p>
    </div>
  );
}
 
export default LoadingSpinner;
 
---
