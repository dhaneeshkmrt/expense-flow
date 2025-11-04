'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Schemas
const fvSchema = z.object({
  principal: z.number().positive(),
  rate: z.number().min(0),
  years: z.number().positive().int(),
});
const lumpsumSchema = z.object({
  principal: z.number().positive(),
  rate: z.number().min(0),
  years: z.number().positive().int(),
});
const sipSchema = z.object({
  monthly_investment: z.number().positive(),
  rate: z.number().min(0),
  years: z.number().positive().int(),
});
const stepUpSipSchema = z.object({
  monthly_investment: z.number().positive(),
  rate: z.number().min(0),
  years: z.number().positive().int(),
  step_up_percentage: z.number().min(0),
});

type FvFormValues = z.infer<typeof fvSchema>;
type LumpsumFormValues = z.infer<typeof lumpsumSchema>;
type SipFormValues = z.infer<typeof sipSchema>;
type StepUpSipFormValues = z.infer<typeof stepUpSipSchema>;

interface ChartData {
  year: number;
  invested: number;
  value: number;
}

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

export default function InvestmentCalculator() {
    const formatCurrency = useCurrencyFormatter();

    // State for results
    const [fvResult, setFvResult] = useState<{ invested: number, returns: number, total: number, chartData: ChartData[] } | null>(null);
    const [lumpsumResult, setLumpsumResult] = useState<{ invested: number, returns: number, total: number, chartData: ChartData[] } | null>(null);
    const [sipResult, setSipResult] = useState<{ invested: number, returns: number, total: number, chartData: ChartData[] } | null>(null);
    const [stepUpSipResult, setStepUpSipResult] = useState<{ invested: number, returns: number, total: number, chartData: ChartData[] } | null>(null);

    // Forms
    const fvForm = useForm<FvFormValues>({ resolver: zodResolver(fvSchema), defaultValues: { principal: 100000, rate: 12, years: 10 } });
    const lumpsumForm = useForm<LumpsumFormValues>({ resolver: zodResolver(lumpsumSchema), defaultValues: { principal: 100000, rate: 12, years: 10 } });
    const sipForm = useForm<SipFormValues>({ resolver: zodResolver(sipSchema), defaultValues: { monthly_investment: 10000, rate: 12, years: 10 } });
    const stepUpSipForm = useForm<StepUpSipFormValues>({ resolver: zodResolver(stepUpSipSchema), defaultValues: { monthly_investment: 10000, rate: 12, years: 10, step_up_percentage: 5 } });
    
    // Calculations
    const onFvSubmit = (data: FvFormValues) => {
        const { principal, rate, years } = data;
        const i = rate / 100;
        const total = principal * Math.pow(1 + i, years);
        const chartData = Array.from({ length: years + 1 }, (_, year) => ({
            year,
            invested: principal,
            value: principal * Math.pow(1 + i, year),
        }));
        setFvResult({ invested: principal, returns: total - principal, total, chartData });
    };

    const onLumpsumSubmit = (data: LumpsumFormValues) => {
        const { principal, rate, years } = data;
        const i = rate / 100;
        const total = principal * Math.pow(1 + i, years);
        const chartData = Array.from({ length: years + 1 }, (_, year) => ({
            year,
            invested: principal,
            value: principal * Math.pow(1 + i, year),
        }));
        setLumpsumResult({ invested: principal, returns: total - principal, total, chartData });
    };

    const onSipSubmit = (data: SipFormValues) => {
        const { monthly_investment, rate, years } = data;
        const i = rate / 100 / 12;
        const n = years * 12;
        const total = monthly_investment * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
        const invested = monthly_investment * n;
        
        const chartData: ChartData[] = [];
        let currentValue = 0;
        for (let year = 1; year <= years; year++) {
            currentValue = 0;
            for (let month = 1; month <= year * 12; month++) {
                currentValue += monthly_investment * Math.pow(1 + i, year * 12 - month + 1);
            }
            chartData.push({ year, invested: monthly_investment * year * 12, value: currentValue });
        }
        chartData.unshift({ year: 0, invested: 0, value: 0 });

        setSipResult({ invested, returns: total - invested, total, chartData });
    };

    const onStepUpSipSubmit = (data: StepUpSipFormValues) => {
        const { monthly_investment, rate, years, step_up_percentage } = data;
        const i = rate / 100;
        const s = step_up_percentage / 100;
        let total = 0;
        let invested = 0;
        let currentSip = monthly_investment * 12;
        const chartData: ChartData[] = [{ year: 0, invested: 0, value: 0 }];

        for (let y = 1; y <= years; y++) {
            invested += currentSip;
            total = (total + currentSip) * (1 + i);
            currentSip *= (1 + s);
            chartData.push({ year: y, invested, value: total });
        }
        setStepUpSipResult({ invested, returns: total - invested, total, chartData });
    };

    const renderResult = (result: { invested: number, returns: number, total: number, chartData: ChartData[] } | null) => {
        if (!result) return null;
        return (
            <Card className="mt-6 bg-muted/50">
                <CardHeader>
                    <CardTitle>Calculation Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Invested Amount</p>
                            <p className="text-xl font-bold">{formatCurrency(result.invested)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Estimated Returns</p>
                            <p className="text-xl font-bold text-green-600">{formatCurrency(result.returns)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Value</p>
                            <p className="text-xl font-bold">{formatCurrency(result.total)}</p>
                        </div>
                    </div>
                     <div className="h-[300px] w-full pt-4">
                        <ResponsiveContainer>
                            <LineChart data={result.chartData}>
                                <XAxis dataKey="year" tickFormatter={(val) => `Yr ${val}`} />
                                <YAxis tickFormatter={(val) => formatCurrency(val, { notation: 'compact' })} />
                                <Tooltip
                                    formatter={(value, name) => formatCurrency(value as number)}
                                    labelFormatter={(label) => `Year ${label}`}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="value" name="Total Value" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                                <Line type="monotone" dataKey="invested" name="Amount Invested" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderForm = (form: any, onSubmit: (data: any) => void, fields: {name: string, label: string, slider: [number, number, number], type?: string}[]) => (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {fields.map(field => (
                     <FormField
                        key={field.name}
                        control={form.control}
                        name={field.name}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel>{field.label}</FormLabel>
                                <div className="flex items-center gap-4">
                                     <FormControl>
                                        <Input 
                                            type="number" 
                                            className="w-32"
                                            value={formField.value} 
                                            onChange={e => formField.onChange(parseFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <Slider
                                        value={[formField.value]}
                                        onValueChange={(vals) => formField.onChange(vals[0])}
                                        min={field.slider[0]}
                                        max={field.slider[1]}
                                        step={field.slider[2]}
                                        className="flex-1"
                                    />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ))}
                <Button type="submit" className="w-full">Calculate</Button>
            </form>
        </Form>
    );

    return (
        <Tabs defaultValue="lumpsum" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="lumpsum">Lumpsum</TabsTrigger>
                <TabsTrigger value="sip">SIP</TabsTrigger>
                <TabsTrigger value="stepupsip">Step-up SIP</TabsTrigger>
                <TabsTrigger value="fv">Future Value</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lumpsum">
                <Card>
                    <CardHeader>
                        <CardTitle>Lumpsum Calculator</CardTitle>
                        <CardDescription>Calculate the future value of a one-time investment.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {renderForm(lumpsumForm, onLumpsumSubmit, [
                            { name: 'principal', label: 'Total Investment', slider: [1000, 10000000, 1000] },
                            { name: 'rate', label: 'Expected Return Rate (p.a. %)', slider: [1, 30, 0.5] },
                            { name: 'years', label: 'Time Period (Years)', slider: [1, 50, 1] },
                        ])}
                        {renderResult(lumpsumResult)}
                        <CalculatorExplanation 
                            title="Lumpsum Calculator"
                            description="A lumpsum calculator helps you determine the future value of a single, one-time investment made today, based on an expected annual rate of return over a specific number of years. It demonstrates the power of compounding on a fixed amount."
                            example="If you invest ₹1,00,000 today for 10 years at a 12% annual return, this calculator will show you how much that single investment will grow to."
                        />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="sip">
                <Card>
                    <CardHeader>
                        <CardTitle>SIP Calculator</CardTitle>
                        <CardDescription>Calculate the future value of your monthly investments.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {renderForm(sipForm, onSipSubmit, [
                            { name: 'monthly_investment', label: 'Monthly Investment', slider: [500, 200000, 500] },
                            { name: 'rate', label: 'Expected Return Rate (p.a. %)', slider: [1, 30, 0.5] },
                            { name: 'years', label: 'Time Period (Years)', slider: [1, 50, 1] },
                        ])}
                        {renderResult(sipResult)}
                         <CalculatorExplanation 
                            title="SIP Calculator"
                            description="A Systematic Investment Plan (SIP) calculator shows the future value of regular, fixed investments made over time (usually monthly). It's ideal for understanding how small, consistent investments can grow into a large corpus."
                            example="If you invest ₹10,000 every month for 10 years at a 12% annual return, this calculator will project the total value of your investment."
                        />
                    </CardContent>
                </Card>
            </TabsContent>

             <TabsContent value="stepupsip">
                <Card>
                    <CardHeader>
                        <CardTitle>Step-up SIP Calculator</CardTitle>
                        <CardDescription>Calculate returns on SIPs with an annual increase in investment.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {renderForm(stepUpSipForm, onStepUpSipSubmit, [
                            { name: 'monthly_investment', label: 'Initial Monthly Investment', slider: [500, 200000, 500] },
                            { name: 'rate', label: 'Expected Return Rate (p.a. %)', slider: [1, 30, 0.5] },
                            { name: 'years', label: 'Time Period (Years)', slider: [1, 50, 1] },
                            { name: 'step_up_percentage', label: 'Annual Increase (%)', slider: [0, 25, 1] },
                        ])}
                        {renderResult(stepUpSipResult)}
                        <CalculatorExplanation 
                            title="Step-up SIP Calculator"
                            description="A Step-up SIP calculator is an advanced version of the SIP calculator. It calculates the future value of your investments when you increase your monthly SIP amount by a fixed percentage each year. This is useful for individuals whose income increases annually."
                            example="If you start a SIP of ₹10,000 and decide to increase it by 5% every year for 10 years at a 12% return, this tool shows your final corpus."
                        />
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="fv">
                <Card>
                    <CardHeader>
                        <CardTitle>Future Value Calculator</CardTitle>
                        <CardDescription>Calculate the future value of a current asset.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {renderForm(fvForm, onFvSubmit, [
                            { name: 'principal', label: 'Present Value', slider: [1000, 10000000, 1000] },
                            { name: 'rate', label: 'Rate of Interest (p.a. %)', slider: [1, 30, 0.5] },
                            { name: 'years', label: 'Number of Years', slider: [1, 50, 1] },
                        ])}
                        {renderResult(fvResult)}
                        <CalculatorExplanation 
                            title="Future Value (FV) Calculator"
                            description="The Future Value (FV) calculator determines the value of a current asset or sum of money at a specified future date, assuming a certain rate of growth (interest rate). It's a fundamental concept in finance for planning and investment decisions."
                            example="Use this to find out what ₹1,00,000 held in a fixed deposit today will be worth in 10 years with an annual interest rate of 7%."
                        />
                    </CardContent>
                </Card>
            </TabsContent>

        </Tabs>
    );
}
