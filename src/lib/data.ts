import type { Category } from '@/lib/types';
import {
  CircleDollarSign,
  Calendar,
  Utensils,
  Gift,
  HeartPulse,
  Plane,
  ShieldAlert,
  Home,
  Briefcase,
  User,
  Building,
  Apple,
} from 'lucide-react';

// This data is used to seed the database on first run if it's empty.
export const categories: Omit<Category, 'id' | 'tenantId'>[] = [

  {
    name: 'Monthly',
    icon: Calendar,
    subcategories: [
      { id: 'monthly_grocery', name: 'Grocery', microcategories: [] },
      { id: 'monthly_petrol', name: 'petrol', microcategories: [] },
      { id: 'monthly_veg', name: 'Veg', microcategories: [] },
      { id: 'monthly_non_veg', name: 'Non-veg', microcategories: [] },
      { id: 'monthly_gas', name: 'Gas', microcategories: [] },
      { id: 'monthly_dk_appa', name: 'Dk Appa', microcategories: [] },
      { id: 'monthly_nisha_amma', name: 'Nisha Amma', microcategories: [] },
      { id: 'monthly_milk', name: 'Milk', microcategories: [] },
      { id: 'monthly_egg', name: 'Egg', microcategories: [] },
      { id: 'monthly_anna_exp', name: 'Anna Exp', microcategories: [] },
      { id: 'monthly_electrical', name: 'Electrical', microcategories: [] },
      { id: 'monthly_others', name: 'Others', microcategories: [] },
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
    name: 'Gift',
    icon: Gift,
    subcategories: [
        { id: 'gift_relatives', name: 'Relatives', microcategories: [] },
        { id: 'gift_close_relatives', name: 'Close Relatives', microcategories: [] },
        { id: 'gift_friends', name: 'Friends', microcategories: [] },
        { id: 'gift_neighbour', name: 'Neighbour', microcategories: [] },
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
        { id: 'medical_health_insurance', name: 'Health Insurance', microcategories: [] },
        { id: 'medical_others', name: 'Others', microcategories: [] },
        { id: 'medical_travel', name: 'Travel', microcategories: [] },
        { id: 'medical_term_insurance', name: 'Term Insurance', microcategories: [] },
        { id: 'medical_pregnancy', name: 'Pregnancy', microcategories: [] },
        { id: 'medical_food', name: 'Food', microcategories: [] },
    ],
  },
  {
    name: 'Tour',
    icon: Plane,
    subcategories: [
        { id: 'tour_travel', name: 'Travel', microcategories: [] },
        { id: 'tour_stay', name: 'Stay', microcategories: [] },
        { id: 'tour_food', name: 'Food', microcategories: [] },
        { id: 'tour_entry_fee', name: 'Entry Fee', microcategories: [] },
        { id: 'tour_shopping', name: 'Shopping', microcategories: [] },
        { id: 'tour_tips_donation', name: 'Tips+Donation', microcategories: [] },
        { id: 'tour_outing', name: 'Outing', microcategories: [] },
        { id: 'tour_outing_food', name: 'Outing Food', microcategories: [] },
    ],
  },
  {
    name: 'Emergency',
    icon: ShieldAlert,
    subcategories: [
        { id: 'emergency_home', name: 'Home', microcategories: [] },
        { id: 'emergency_medical', name: 'Medical', microcategories: [] },
        { id: 'emergency_tour', name: 'Tour', microcategories: [] },
        { id: 'emergency_gift', name: 'Gift', microcategories: [] },
        { id: 'emergency_bike', name: 'Bike', microcategories: [] },
    ],
  }
];
