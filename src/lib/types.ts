export type Microcategory = {
  id: string;
  name: string;
};

export type Subcategory = {
  id: string;
  name: string;
  microcategories: Microcategory[];
};

export type Category = {
  id: string;
  name: string;
  icon: React.ElementType | string; // Allow string for storing in DB
  subcategories: Subcategory[];
};

export type Transaction = {
  id: string;
  date: string;
  time: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string;
  microcategory: string;
  paidBy: string;
  notes?: string;
};
