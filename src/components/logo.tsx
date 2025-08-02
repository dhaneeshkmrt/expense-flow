export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="48"
        height="48"
        viewBox="0 0 160 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 0 H80 V20 L60 20 V80 L80 80 V100 H0 V0 Z"
          fill="#007BFF"
        />
        <path
          d="M0 0 H60 L20 20 H0 V0 Z"
          fill="#00BFFF"
        />
        <path
          d="M0 100 H60 L20 80 H0 V100 Z"
          fill="#32CD32"
        />
        <path
          d="M60 20 L80 20 V80 L60 80 L60 20 Z"
          fill="#FFA500"
        />
        <path
          d="M85 20 L160 20 V100 L140 100 L85 20 Z"
          fill="#FF1493"
        />
        <path
          d="M85 20 L140 100 L120 100 L85 45 V20 Z"
          fill="#C71585"
        />
      </svg>
      <h1 className="text-xl font-bold tracking-tight text-primary">ExpenseFlow</h1>
    </div>
  );
}
