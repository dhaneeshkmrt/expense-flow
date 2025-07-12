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
    subcategories: [{ name: 'Salary', id: 'income_salary', microcategories: [] }],
  },
  {
    name: 'Home',
    icon: Home,
    subcategories: [
      { name: 'Rent', id: 'home_rent', microcategories: [] },
      { name: 'Groceries', id: 'home_groceries', microcategories: [] },
      { name: 'Bills', id: 'home_bills', microcategories: [] },
    ],
  },
  {
    name: 'Food & Snack',
    icon: Utensils,
    subcategories: [
      { name: 'Restaurant', id: 'food_restaurant', microcategories: [] },
      { name: 'Snacks', id: 'food_snacks', microcategories: [] },
    ],
  },
  {
    name: 'Personal',
    icon: Sparkles,
    subcategories: [
        { name: 'Clothes', id: 'personal_clothes', microcategories: [] },
        { name: 'Personal Care', id: 'personal_care', microcategories: [] }
    ],
  },
  {
    name: 'Gifts',
    icon: Gift,
    subcategories: [{ name: 'Friends & Family', id: 'gifts_friends_family', microcategories: [] }],
  },
  {
    name: 'Medical',
    icon: HeartPulse,
    subcategories: [
        { name: 'Pharmacy', id: 'medical_pharmacy', microcategories: [] },
        { name: 'Doctor', id: 'medical_doctor', microcategories: [] }
    ],
  },
  {
    name: 'Travel',
    icon: Plane,
    subcategories: [
        { name: 'Flights', id: 'travel_flights', microcategories: [] },
        { name: 'Hotels', id: 'travel_hotels', microcategories: [] }
    ],
  },
  {
    name: 'Emergency',
    icon: ShieldAlert,
    subcategories: [{ name: 'Emergency Fund', id: 'emergency_fund', microcategories: [] }],
  },
  {
    name: 'Education',
    icon: GraduationCap,
    subcategories: [
        { name: 'Fees', id: 'education_fees', microcategories: [] },
        { name: 'Books', id: 'education_books', microcategories: [] }
    ],
  },
  {
    name: 'Industrial',
    icon: Factory,
    subcategories: [
        { name: 'Raw Material', id: 'industrial_raw_material', microcategories: [] }
    ],
  },
];
