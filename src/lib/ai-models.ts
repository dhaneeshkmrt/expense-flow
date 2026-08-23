/**
 * Supported and experimental AI model configurations for Google Gemini.
 */
export interface AIModelOption {
  value: string;
  label: string;
  description?: string;
  isNew?: boolean;
}

export const GEMINI_MODELS: AIModelOption[] = [
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Default & Recommended)', description: 'Fast, intelligent next-gen flash model', isNew: true },
  { value: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', description: 'Next-gen multimodal model', isNew: true },
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', description: 'Advanced next-gen flash', isNew: true },
  { value: 'gemini-3.0-flash', label: 'Gemini 3.0 Flash', description: 'Next-gen flash architecture', isNew: true },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Multimodal flash model' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'High capability deep reasoning' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Stable & high availability' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', description: 'Ultra-fast lightweight throughput' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Stable 1.5 model' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Stable 1.5 Pro reasoning' },
  { value: 'custom', label: 'Custom Model ID', description: 'Enter any custom or future model ID' },
];

export const DEFAULT_AI_MODEL = 'gemini-3.6-flash';
