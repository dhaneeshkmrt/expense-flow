'use client';

import ReturnsCalculator from '@/components/calculators/returns-calculator';

export default function ReturnsCalculatorsPage() {
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Investment Returns Calculators</h1>
        <p className="text-muted-foreground">
          Analyze the performance of your investments.
        </p>
      </div>
      <ReturnsCalculator />
    </div>
  );
}
