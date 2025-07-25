
import type { Category, Settings } from '@/lib/types';
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
    name: 'Fruits',
    icon: Apple,
    subcategories: [
        { id: 'fruits_fruits', name: 'Fruits', microcategories: [] },
        { id: 'fruits_nuts', name: 'Nuts', microcategories: [] },
    ]
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
  },
  {
    name: 'Home',
    icon: Home,
    subcategories: [
        { id: 'home_electrical', name: 'Electrical', microcategories: [] },
        { id: 'home_plumbing', name: 'Plumbing', microcategories: [] },
        { id: 'home_construction', name: 'Construction', microcategories: [] },
        { id: 'home_utensils', name: 'Utensils', microcategories: [] },
        { id: 'home_farm_garden', name: 'Farm & Garden', microcategories: [] },
        { id: 'home_decoration', name: 'Decoration', microcategories: [] },
        { id: 'home_land_maintenance', name: 'Land Maintenance', microcategories: [] },
    ],
  },
  {
    name: 'DK professional',
    icon: Briefcase,
    subcategories: [
        { id: 'dk_professional_subscriptions', name: 'Subscriptions', microcategories: [] },
        { id: 'dk_professional_meetups', name: 'Meetups', microcategories: [] },
        { id: 'dk_professional_shopping', name: 'Shopping', microcategories: [] },
    ],
  },
  {
    name: 'Nisha',
    icon: User,
    subcategories: [
        { id: 'nisha_invesment', name: 'Invesment', microcategories: [] },
        { id: 'nisha_mobile', name: 'Mobile', microcategories: [] },
        { id: 'nisha_personal_grooming', name: 'Personal Grooming', microcategories: [] },
        { id: 'nisha_gift', name: 'Gift', microcategories: [] },
        { id: 'nisha_office', name: 'Office', microcategories: [] },
        { id: 'nisha_borrow', name: 'Borrow', microcategories: [] },
        { id: 'nisha_cash_rtn', name: 'Cash Rtn', microcategories: [] },
    ],
  },
  {
    name: 'Dk',
    icon: User,
    subcategories: [
        { id: 'dk_invesment', name: 'Invesment', microcategories: [] },
        { id: 'dk_mobile_internet', name: 'Mobile&Internet', microcategories: [] },
        { id: 'dk_personal_grooming', name: 'Personal Grooming', microcategories: [] },
        { id: 'dk_gift', name: 'Gift', microcategories: [] },
        { id: 'dk_borrow', name: 'Borrow', microcategories: [] },
        { id: 'dk_subscriptions', name: 'Subscriptions', microcategories: [] },
        { id: 'dk_others', name: 'Others', microcategories: [] },
        { id: 'dk_office_expense', name: 'Office expense', microcategories: [] },
        { id: 'dk_cash_rtn', name: 'Cash Rtn', microcategories: [] },
    ],
  },
  {
    name: 'WFO',
    icon: Building,
    subcategories: [
        { id: 'wfo_travel', name: 'Travel', microcategories: [] },
        { id: 'wfo_food', name: 'Food', microcategories: [] },
        { id: 'wfo_home', name: 'Home', microcategories: [] },
        { id: 'wfo_gift', name: 'Gift', microcategories: [] },
        { id: 'wfo_local_travel', name: 'Local Travel', microcategories: [] },
        { id: 'wfo_internet_subscriptions', name: 'Internet+ subscriptions', microcategories: [] },
        { id: 'wfo_sports', name: 'Sports', microcategories: [] },
        { id: 'wfo_monthly', name: 'Monthly', microcategories: [] },
        { id: 'wfo_dmart', name: 'DMart', microcategories: [] },
        { id: 'wfo_quick_commerce_app', name: 'Quick Commerce App', microcategories: [] },
    ],
  },
];


export const defaultSettings: Omit<Settings, 'tenantId'> = { currency: '₹', locale: 'en-IN' };
