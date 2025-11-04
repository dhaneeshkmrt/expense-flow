'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const loanSchema = z.object({
    amount: z.number().positive(),
    rate: z.number().positive(),
    years: z.number().positive().int(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

interface ChartData {
    name: string;
    value: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))'];

const CalculatorExplanation = ({ title, description, example }: { title: string, description: string, example: string }) => (
    <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="explanation">
            <AccordionTrigger>What is {title}?</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <div>
                        <h4 className="font-semibold text-sm">Example:</h4>
                        <p className="text-sm text-muted-foreground italic">{example}</p>
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    </Accordion>
);

export default function LoanCalculator() {
    const formatCurrency = useCurrencyFormatter();
    const [result, setResult] = useState<{ emi: number, totalInterest: number, totalPayment: number, chartData: ChartData[] } | null>(null);

    const form = useForm<LoanFormValues>({
        resolver: zodResolver(loanSchema),
        defaultValues: {
            amount: 500000,
            rate: 10,
            years: 5,
        },
    });

    const onSubmit = (data: LoanFormValues) => {
        const { amount, rate, years } = data;
        const principal = amount;
        const monthlyRate = rate / 12 / 100;
        const n = years * 12;

        const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
        const totalPayment = emi * n;
        const totalInterest = totalPayment - principal;

        setResult({
            emi,
            totalInterest,
            totalPayment,
            chartData: [
                { name: 'Principal Amount', value: principal },
                { name: 'Total Interest', value: totalInterest },
            ],
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardDescription>Suitable for both Home Loans and Personal Loans.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                         <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Loan Amount</FormLabel>
                                    <div className="flex items-center gap-4">
                                        <FormControl>
                                            <Input type="number" className="w-32" {...field} onChange={e => field.onChange(parseFloat(e.target.value))}/>
                                        </FormControl>
                                        <Slider
                                            value={[field.value]}
                                            onValueChange={(vals) => field.onChange(vals[0])}
                                            min={10000}
                                            max={20000000}
                                            step={10000}
                                        />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="rate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Interest Rate (p.a. %)</FormLabel>
                                    <div className="flex items-center gap-4">
                                        <FormControl>
                                            <Input type="number" className="w-32" {...field} onChange={e => field.onChange(parseFloat(e.target.value))}/>
                                        </FormControl>
                                        <Slider
                                            value={[field.value]}
                                            onValueChange={(vals) => field.onChange(vals[0])}
                                            min={1}
                                            max={20}
                                            step={0.1}
                                        />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="years"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Loan Tenure (Years)</FormLabel>
                                    <div className="flex items-center gap-4">
                                        <FormControl>
                                            <Input type="number" className="w-32" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                        </FormControl>
                                        <Slider
                                            value={[field.value]}
                                            onValueChange={(vals) => field.onChange(vals[0])}
                                            min={1}
                                            max={30}
                                            step={1}
                                        />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">Calculate EMI</Button>
                    </form>
                </Form>

                {result && (
                    <Card className="mt-6 bg-muted/50">
                        <CardHeader>
                            <CardTitle>Loan Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="space-y-4 text-center md:text-left">
                                     <div>
                                        <p className="text-sm text-muted-foreground">Monthly EMI</p>
                                        <p className="text-3xl font-bold">{formatCurrency(result.emi)}</p>
                                    </div>
                                     <div>
                                        <p className="text-sm text-muted-foreground">Total Interest Payable</p>
                                        <p className="text-xl font-bold">{formatCurrency(result.totalInterest)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Payment (Principal + Interest)</p>
                                        <p className="text-xl font-bold">{formatCurrency(result.totalPayment)}</p>
                                    </div>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={result.chartData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {result.chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                 <CalculatorExplanation 
                    title="Loan EMI Calculator"
                    description="An EMI (Equated Monthly Installment) calculator helps you compute the monthly payment you need to make towards a loan. It applies to home loans, car loans, and personal loans. This helps you understand your monthly financial commitment before you take a loan."
                    example="If you take a personal loan of ₹5,00,000 for 5 years at a 10% interest rate, this calculator will tell you the fixed amount you need to pay each month."
                />
            </CardContent>
        </Card>
    );
}
