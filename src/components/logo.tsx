export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/icons/dn-logo.png"
        alt="ExpenseFlow logo"
        width="48"
        height="48"
      />
      <h1 className="text-xl font-bold tracking-tight text-primary">ExpenseFlow</h1>
    </div>
  );
}
