import type { Category } from '@/lib/types';
import {
  CircleDollarSign,
  Utensils,
  Sparkles,
  Gift,
  HeartPulse,
  Plane,
  ShieldAlert,
  Home,
  GraduationCap,
  Factory,
} from 'lucide-react';

// This data is used to seed the database on first run if it's empty.
export const categories: Omit<Category, 'id' | 'tenantId'>[] = [
  // All default categories have been removed as per user request for a clean slate.
  // The application will now start with no default categories.
  // You can add new categories through the UI.
];
