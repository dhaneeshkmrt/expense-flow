import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex justify-center items-center gap-2">
      <Image
        src="/images/logo.jpeg"
        alt="Money Purse logo"
        width="48"
        height="48"
        className="rounded-lg"
      />
      <h1 className="text-xl font-bold tracking-tight text-primary">Money Purse</h1>
    </div>
  );
}
