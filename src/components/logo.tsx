import Image from 'next/image';
import firebaseImageLoader from '../../loader';

export function Logo() {
  return (
    <div className="flex justify-center items-center gap-2">
      <h1 className="text-xl font-bold tracking-tight text-primary">Money Purse</h1>
    </div>
  );
}
