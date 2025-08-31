import Image from 'next/image';
import firebaseImageLoader from '../../loader';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/icons/dn-logo.png"
        alt="Money Purse logo"
        width="48"
        height="48"
      />
      <h1 className="text-xl font-bold tracking-tight text-primary">ExpenseFlow</h1>
    </div>
  );
}
