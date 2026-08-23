'use server';
/**
 * @fileOverview AI flow to process receipt / bill images and extract total amount,
 * store name, date, and itemized split transactions matched to categories.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

import {googleAI} from '@genkit-ai/google-genai';

const CategoryInfoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  subcategories: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    microcategories: z.array(z.string()).optional(),
  })).optional(),
});

const ProcessReceiptInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo or scan of a shopping receipt or bill, as a data URI. Expected format: 'data:image/<type>;base64,<encoded_data>'."
    ),
  availableCategories: z.array(z.string()).optional().describe('List of available category names.'),
  categoryDetails: z.array(CategoryInfoSchema).optional().describe('Detailed category hierarchy with descriptions and guidelines for accurate categorization.'),
  model: z.string().optional().describe('The Gemini model to use for processing.'),
});
export type ProcessReceiptInput = z.infer<typeof ProcessReceiptInputSchema>;

const ProcessReceiptItemSchema = z.object({
  description: z.string().describe('Item name or concise description in English.'),
  amount: z.number().describe('Total price/amount for this line item.'),
  category: z.string().optional().describe('Matching category from the provided list based on expense guidelines.'),
  subcategory: z.string().optional().describe('Matching subcategory from the provided list based on expense guidelines.'),
  microcategory: z.string().optional().describe('Matching microcategory if applicable.'),
  quantity: z.string().optional().describe('Quantity or weight if visible (e.g., "2 pcs", "1 kg").'),
  notes: z.string().optional().describe('Any extra item details, discounts, or tags.'),
});

const ProcessReceiptOutputSchema = z.object({
  storeName: z.string().optional().describe('Name of the store, merchant, supermarket, or service provider.'),
  totalAmount: z.number().optional().describe('Grand total / final bill amount paid.'),
  date: z.string().optional().describe('Date of the receipt in YYYY-MM-DD format if visible.'),
  items: z.array(ProcessReceiptItemSchema).describe('List of line items on the receipt.'),
  notes: z.string().optional().describe('Additional details like invoice number, tax, payment method, or discount summary.'),
});
export type ProcessReceiptOutput = z.infer<typeof ProcessReceiptOutputSchema>;

const prompt = ai.definePrompt({
  name: 'processReceiptPrompt',
  input: { schema: ProcessReceiptInputSchema },
  output: { schema: ProcessReceiptOutputSchema },
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: `You are an expert AI accountant and receipt extraction assistant.
Analyze the provided bill or receipt image with high precision.

TASKS:
1. **Store/Merchant Name**: Identify the shop, supermarket, restaurant, or business name (e.g., "DMart", "Reliance Fresh", "Apollo Pharmacy", "Nilgiris").
2. **Total Bill Amount**: Locate the final grand total / net payable amount.
3. **Receipt Date**: Locate the transaction date and convert it to YYYY-MM-DD format. If only time or today's date is relevant, estimate accurately.
4. **Line Items Extraction**:
   - Extract every purchased item with its net price/amount.
   - If multiple identical items are listed (e.g. 2 x 50), provide the final total for that line (100) or separate them clearly.
   - Ensure the description is clean, in English, and human-readable (e.g. "Toned Milk 500ml", "Almonds 250g", "Tomatoes 1kg", "Paracetamol").
5. **Category, Subcategory & Microcategory Mapping**:
   Match EACH item to the most fitting category, subcategory, and microcategory using the provided Category Guidelines:

{{#if categoryDetails}}
CATEGORY EXPENSE GUIDELINES & HIERARCHY:
{{#each categoryDetails}}
- Category: "{{name}}"{{#if description}} (Guideline: {{description}}){{/if}}
  {{#each subcategories}}
  * Subcategory: "{{name}}"{{#if description}} (Guideline: {{description}}){{/if}}{{#if microcategories}} [Microcategories: {{#each microcategories}}{{this}}, {{/each}}]{{/if}}
  {{/each}}
{{/each}}
{{else}}
Available Categories: {{#each availableCategories}}{{{this}}}, {{/each}}
{{/if}}

IMPORTANT RULES:
- Always choose exact category and subcategory names from the provided hierarchy whenever a logical match exists.
- If a microcategory matches the item (e.g. category "Food" -> subcategory "Dairy" -> microcategory "Milk"), set microcategory accordingly.
- Keep amounts numeric (positive numbers).
- If the receipt is long, capture all distinct items and their amounts accurately.

Receipt Image: {{media url=imageDataUri}}`,
});

const processReceiptFlow = ai.defineFlow(
  {
    name: 'processReceiptFlow',
    inputSchema: ProcessReceiptInputSchema,
    outputSchema: ProcessReceiptOutputSchema,
  },
  async input => {
    const selectedModelName = input.model || 'gemini-2.0-flash';
    try {
      const {output} = await prompt(input, {
        model: googleAI.model(selectedModelName as any),
      });
      if (!output) throw new Error('AI could not analyze the receipt. Please ensure the receipt image is clear and well-lit.');
      return output;
    } catch (err: any) {
      // If error is 503 high demand or unavailable and user was not already on gemini-2.0-flash, try fallback
      if (selectedModelName !== 'gemini-2.0-flash' && (err?.message?.includes('503') || err?.message?.includes('high demand') || err?.message?.includes('UNAVAILABLE'))) {
        console.warn(`Model ${selectedModelName} unavailable, falling back to gemini-2.0-flash...`);
        const {output} = await prompt(input, {
          model: googleAI.model('gemini-2.0-flash'),
        });
        if (output) return output;
      }
      throw err;
    }
  }
);

export async function processReceiptTransaction(input: ProcessReceiptInput): Promise<ProcessReceiptOutput> {
  try {
    return await processReceiptFlow(input);
  } catch (error: any) {
    console.error('Receipt AI processing failed:', error);
    throw new Error(error.message || 'Failed to process receipt. Please ensure image is clear and try again.');
  }
}
