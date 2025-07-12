// This is a server-side file!
'use server';

/**
 * @fileOverview Provides AI-powered suggestions for transaction categories.
 *
 * - suggestTransactionCategories - A function that suggests categories for transactions.
 * - SuggestTransactionCategoriesInput - The input type for the suggestTransactionCategories function.
 * - SuggestTransactionCategoriesOutput - The return type for the suggestTransactionCategories function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTransactionCategoriesInputSchema = z.object({
  transactionDescription: z
    .string()
    .describe('The description of the transaction.'),
  availableCategories: z
    .array(z.string())
    .describe('The list of available categories.'),
  availableSubcategories: z
    .array(z.string())
    .describe('The list of available subcategories.'),
});
export type SuggestTransactionCategoriesInput = z.infer<
  typeof SuggestTransactionCategoriesInputSchema
>;

const SuggestTransactionCategoriesOutputSchema = z.object({
  suggestedCategory: z
    .string()
    .describe('The AI-suggested category for the transaction.'),
  suggestedSubcategory: z
    .string()
    .describe('The AI-suggested subcategory for the transaction.'),
});
export type SuggestTransactionCategoriesOutput = z.infer<
  typeof SuggestTransactionCategoriesOutputSchema
>;

export async function suggestTransactionCategories(
  input: SuggestTransactionCategoriesInput
): Promise<SuggestTransactionCategoriesOutput> {
  return suggestTransactionCategoriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTransactionCategoriesPrompt',
  input: {
    schema: SuggestTransactionCategoriesInputSchema,
  },
  output: {
    schema: SuggestTransactionCategoriesOutputSchema,
  },
  prompt: `Given the following transaction description, suggest a category and subcategory from the available options.

Transaction Description: {{{transactionDescription}}}
Available Categories: {{#each availableCategories}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Available Subcategories: {{#each availableSubcategories}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Category: {{suggestedCategory}}
Subcategory: {{suggestedSubcategory}}`,
});

const suggestTransactionCategoriesFlow = ai.defineFlow(
  {
    name: 'suggestTransactionCategoriesFlow',
    inputSchema: SuggestTransactionCategoriesInputSchema,
    outputSchema: SuggestTransactionCategoriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
