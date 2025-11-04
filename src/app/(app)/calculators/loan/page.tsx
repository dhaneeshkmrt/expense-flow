'use client';

import LoanCalculator from '@/components/calculators/loan-calculator';

export default function LoanCalculatorPage() {
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Loan EMI Calculator</h1>
        <p className="text-muted-foreground">
          Calculate your Equated Monthly Installment (EMI) for loans.
        </p>
      </div>
      <LoanCalculator />
    </div>
  );
}
