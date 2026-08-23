'use server';

/**
 * @fileOverview Provides AI-powered suggestions for transaction categories.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategoryInfoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  subcategories: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    microcategories: z.array(z.string()).optional(),
  })).optional(),
});

const SuggestTransactionCategoriesInputSchema = z.object({
  transactionDescription: z
    .string()
    .describe('The description of the transaction.'),
  availableCategories: z
    .array(z.string())
    .optional()
    .describe('The list of available categories.'),
  availableSubcategories: z
    .array(z.string())
    .optional()
    .describe('The list of available subcategories.'),
  categoryDetails: z
    .array(CategoryInfoSchema)
    .optional()
    .describe('Categories with descriptions and subcategories for accurate matching.'),
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

const prompt = ai.definePrompt({
  name: 'suggestTransactionCategoriesPrompt',
  input: {
    schema: SuggestTransactionCategoriesInputSchema,
  },
  output: {
    schema: SuggestTransactionCategoriesOutputSchema,
  },
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: `You are an AI financial assistant. Given the following transaction description, suggest the most appropriate category and subcategory from the provided lists using the expense guidelines.

Transaction Description: {{{transactionDescription}}}

{{#if categoryDetails}}
Category Guidelines:
{{#each categoryDetails}}
- Category: "{{name}}"{{#if description}} ({{description}}){{/if}}
  {{#each subcategories}}
  * Subcategory: "{{name}}"{{#if description}} ({{description}}){{/if}}{{#if microcategories}} [Micros: {{#each microcategories}}{{this}}, {{/each}}]{{/if}}
  {{/each}}
{{/each}}
{{else}}
Available Categories: 
{{#each availableCategories}}- {{{this}}}
{{/each}}

Available Subcategories:
{{#each availableSubcategories}}- {{{this}}}
{{/each}}
{{/if}}

Return the best matching pair from the lists.`,
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

export async function suggestTransactionCategories(
  input: SuggestTransactionCategoriesInput
): Promise<SuggestTransactionCategoriesOutput> {
  try {
    return await suggestTransactionCategoriesFlow(input);
  } catch (error) {
    console.error('AI categorization failed:', error);
    return { suggestedCategory: '', suggestedSubcategory: '' };
  }
}
