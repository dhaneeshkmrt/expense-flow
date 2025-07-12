export type Transaction = {
  id: string;
  date: string;
  time: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string;
  paidBy: string;
  notes?: string;
};

export type Subcategory = {
  id: string;
  name: string;
};

export type Category = {
  id: string;
  name: string;
  icon: React.ElementType;
  subcategories: Subcategory[];
};
