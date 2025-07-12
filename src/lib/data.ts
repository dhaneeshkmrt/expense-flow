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
  {
    name: 'Income',
    icon: CircleDollarSign,
    subcategories: [
      { id: 'income_monthly', name: 'Monthly', microcategories: [] },
      { id: 'income_appa_fd_interest', name: 'Appa FD Interest', microcategories: [] },
      { id: 'income_fruits', name: 'Fruits', microcategories: [] },
      { id: 'income_food_snack', name: 'Food & Snack', microcategories: [] },
      { id: 'income_gift', name: 'Gift', microcategories: [] },
    ],
  },
  {
    name: 'Monthly',
    icon: Utensils,
    subcategories: [
      { id: 'monthly_grocery', name: 'Grocery', microcategories: [] },
      { id: 'monthly_petrol', name: 'petrol', microcategories: [] },
      { id: 'monthly_veg', name: 'Veg', microcategories: [] },
      { id: 'monthly_non_veg', name: 'Non-veg', microcategories: [] },
      { id: 'monthly_gas', name: 'Gas', microcategories: [] },
    ],
  },
  {
    name: 'Food & Snack',
    icon: Utensils,
    subcategories: [
      { id: 'food_snack_food', name: 'Food', microcategories: [] },
      { id: 'food_snack_snacks', name: 'Snacks', microcategories: [] },
    ],
  },
  {
    name: 'Fruits',
    icon: Sparkles,
    subcategories: [
      { id: 'fruits_fruits', name: 'Fruits', microcategories: [] },
      { id: 'fruits_nuts', name: 'Nuts', microcategories: [] },
    ],
  },
  {
    name: 'Gift',
    icon: Gift,
    subcategories: [
      { id: 'gift_relatives', name: 'Relatives', microcategories: [] },
      { id: 'gift_friends', name: 'Friends', microcategories: [] },
      { id: 'gift_donation', name: 'Donation', microcategories: [] },
    ],
  },
  {
    name: 'Medical',
    icon: HeartPulse,
    subcategories: [
      { id: 'medical_hospital_bill', name: 'Hospital Bill', microcategories: [] },
      { id: 'medical_medical_bill', name: 'Medical Bill', microcategories: [] },
      { id: 'medical_lab_test', name: 'Lab test', microcategories: [] },
    ],
  },
  {
    name: 'Tour',
    icon: Plane,
    subcategories: [
      { id: 'tour_travel', name: 'Travel', microcategories: [] },
      { id: 'tour_stay', name: 'Stay', microcategories: [] },
      { id: 'tour_food', name: 'Food', microcategories: [] },
    ],
  },
  {
    name: 'Emergency',
    icon: ShieldAlert,
    subcategories: [
      { id: 'emergency_home', name: 'Home', microcategories: [] },
      { id: 'emergency_medical', name: 'Medical', microcategories: [] },
    ],
  },
  {
    name: 'Home',
    icon: Home,
    subcategories: [
      { id: 'home_electrical', name: 'Electrical', microcategories: [] },
      { id: 'home_plumbing', name: 'Plumbing', microcategories: [] },
      { id: 'home_construction', name: 'Construction', microcategories: [] },
    ],
  },
];
