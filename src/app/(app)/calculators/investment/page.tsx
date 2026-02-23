'use client';

import InvestmentCalculator from '@/components/calculators/investment-calculator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function InvestmentCalculatorsPage() {
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Investment Calculators</h1>
        <p className="text-muted-foreground">
          Plan your investments and forecast their growth.
        </p>
      </div>
      <InvestmentCalculator />
    </div>
  );
}
