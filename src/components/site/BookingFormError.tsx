export default function BookingFormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
      {message}
    </div>
  );
}
