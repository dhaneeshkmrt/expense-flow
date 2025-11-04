
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Trash2, PlusCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

// Schemas
const cagrSchema = z.object({
    initialValue: z.number().positive('Initial value must be positive'),
    finalValue: z.number().positive('Final value must be positive'),
    years: z.number().positive('Years must be a positive number'),
});

const xirrSchema = z.object({
    cashflows: z.array(z.object({
        amount: z.number(),
        date: z.date(),
    })).min(2, 'At least two cashflows are required (initial investment and final value)'),
});

type CagrFormValues = z.infer<typeof cagrSchema>;
type XirrFormValues = z.infer<typeof xirrSchema>;

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

// XIRR calculation function (Newton-Raphson method)
function calculateXIRR(cashflows: { amount: number; date: Date }[]): number | null {
    const sortedFlows = [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstDate = sortedFlows[0].date;

    const xnpv = (rate: number): number => {
        let total = 0;
        for (const flow of sortedFlows) {
            const days = (flow.date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
            total += flow.amount / Math.pow(1 + rate, days / 365.0);
        }
        return total;
    };

    const xnpvDerivative = (rate: number): number => {
        let total = 0;
        for (const flow of sortedFlows) {
            const days = (flow.date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
            if (days > 0) {
                total -= (flow.amount * days) / (365.0 * Math.pow(1 + rate, (days / 365.0) + 1));
            }
        }
        return total;
    };

    let guess = 0.1; // Initial guess
    const maxIterations = 100;
    const tolerance = 1.0e-7;

    for (let i = 0; i < maxIterations; i++) {
        const value = xnpv(guess);
        const derivative = xnpvDerivative(guess);
        if (Math.abs(derivative) < tolerance) break;

        const newValue = guess - value / derivative;
        if (Math.abs(newValue - guess) < tolerance) {
            return newValue * 100; // Return as percentage
        }
        guess = newValue;
    }
    
    return null; // Failed to converge
}

export default function ReturnsCalculator() {
    const formatCurrency = useCurrencyFormatter();
    const [cagrResult, setCagrResult] = useState<number | null>(null);
    const [xirrResult, setXirrResult] = useState<number | null>(null);

    // Forms
    const cagrForm = useForm<CagrFormValues>({ resolver: zodResolver(cagrSchema), defaultValues: { initialValue: 100000, finalValue: 250000, years: 5 } });
    const xirrForm = useForm<XirrFormValues>({ 
        resolver: zodResolver(xirrSchema), 
        defaultValues: { 
            cashflows: [
                { amount: -100000, date: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) },
                { amount: 120000, date: new Date() },
            ] 
        } 
    });
    
    const { fields, append, remove } = useFieldArray({
        control: xirrForm.control,
        name: "cashflows",
    });

    const onCagrSubmit = (data: CagrFormValues) => {
        const { initialValue, finalValue, years } = data;
        const cagr = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
        setCagrResult(cagr);
    };
    
    const onXirrSubmit = (data: XirrFormValues) => {
        const result = calculateXIRR(data.cashflows);
        setXirrResult(result);
    };
    
    return (
        <Tabs defaultValue="cagr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cagr">CAGR</TabsTrigger>
                <TabsTrigger value="xirr">XIRR</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cagr">
                <Card>
                    <CardHeader>
                        <CardTitle>CAGR Calculator</CardTitle>
                        <CardDescription>Calculate the Compound Annual Growth Rate of an investment.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Form {...cagrForm}>
                            <form onSubmit={cagrForm.handleSubmit(onCagrSubmit)} className="space-y-4">
                                <FormField name="initialValue" control={cagrForm.control} render={({field}) => (
                                    <FormItem><FormLabel>Initial Value</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="finalValue" control={cagrForm.control} render={({field}) => (
                                    <FormItem><FormLabel>Final Value</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="years" control={cagrForm.control} render={({field}) => (
                                    <FormItem><FormLabel>Number of Years</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem>
                                )} />
                                <Button type="submit">Calculate CAGR</Button>
                            </form>
                        </Form>
                        {cagrResult !== null && (
                            <Card className="mt-6 bg-muted/50">
                                <CardHeader>
                                    <CardTitle>CAGR Result</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-center">{cagrResult.toFixed(2)}%</p>
                                </CardContent>
                            </Card>
                        )}
                         <CalculatorExplanation 
                            title="CAGR (Compound Annual Growth Rate)"
                            description="CAGR measures the mean annual growth rate of an investment over a specified period longer than one year. It's a useful way to smooth out volatile returns and understand the 'average' year-over-year growth."
                            example="If your investment of ₹1,00,000 grew to ₹1,50,000 over 3 years, the CAGR calculator tells you the steady annual percentage rate at which it grew."
                        />
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="xirr">
                <Card>
                    <CardHeader>
                        <CardTitle>XIRR Calculator</CardTitle>
                        <CardDescription>Calculate the Internal Rate of Return for irregular cash flows.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Form {...xirrForm}>
                            <form onSubmit={xirrForm.handleSubmit(onXirrSubmit)} className="space-y-4">
                                <div>
                                    <Label>Cash Flows</Label>
                                    <p className="text-xs text-muted-foreground mb-2">Enter investments as negative values and withdrawals/final value as positive values.</p>
                                    <div className="space-y-2">
                                    {fields.map((item, index) => (
                                        <div key={item.id} className="flex gap-2 items-start">
                                            <FormField name={`cashflows.${index}.amount`} control={xirrForm.control} render={({field}) => (
                                                <FormItem className="flex-1"><FormControl><Input type="number" placeholder="Amount" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField name={`cashflows.${index}.date`} control={xirrForm.control} render={({field}) => (
                                                <FormItem className="flex-1">
                                                     <Popover>
                                                        <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                            variant={"outline"}
                                                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground" )}
                                                            >
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                                <Button type="button" variant="outline" onClick={() => append({ amount: 0, date: new Date() })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Cash Flow
                                </Button>
                                <Button type="submit">Calculate XIRR</Button>
                            </form>
                        </Form>
                         {xirrResult !== null && (
                            <Card className="mt-6 bg-muted/50">
                                <CardHeader>
                                    <CardTitle>XIRR Result</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-bold text-center">{xirrResult.toFixed(2)}%</p>
                                </CardContent>
                            </Card>
                        )}
                        {xirrResult === null && xirrForm.formState.isSubmitted && (
                             <Card className="mt-6 bg-destructive/10 border-destructive">
                                <CardHeader>
                                    <CardTitle>Calculation Error</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-center">Could not calculate XIRR. Please check your cash flows. Ensure there are both positive and negative values.</p>
                                </CardContent>
                            </Card>
                        )}
                         <CalculatorExplanation 
                            title="XIRR (Extended Internal Rate of Return)"
                            description="XIRR is used to calculate the return on investments where cash flows (investments and withdrawals) are not regular. It's more accurate than CAGR for SIPs, lumpsum investments, and redemptions that happen at irregular intervals."
                            example="If you invested ₹50,000 on Jan 1, another ₹20,000 on June 15, and your total investment value is ₹85,000 on Dec 31, XIRR calculates your precise, annualized return."
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

    