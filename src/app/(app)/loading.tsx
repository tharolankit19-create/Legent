export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="h-8 w-56 animate-shimmer rounded-md bg-secondary" />
      <div className="mt-2 h-4 w-40 animate-shimmer rounded-md bg-secondary" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-shimmer rounded-xl bg-secondary" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-shimmer rounded-xl bg-secondary" />
        <div className="h-64 animate-shimmer rounded-xl bg-secondary" />
      </div>
    </div>
  );
}
