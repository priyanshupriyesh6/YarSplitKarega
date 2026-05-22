// ─────────────────────────────────────────────
//  Expense Categories — Icons, Colors, Keywords
// ─────────────────────────────────────────────

export type CategoryId =
  | 'food'
  | 'transport'
  | 'housing'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'travel'
  | 'utilities'
  | 'education'
  | 'fitness'
  | 'subscriptions'
  | 'other';

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;        // Ionicons name
  color: string;       // hex
  gradientColors: [string, string];
  keywords: string[];  // for auto-categorization from OCR
}

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    label: 'Food & Drinks',
    icon: 'restaurant',
    color: '#FF6B6B',
    gradientColors: ['#FF6B6B', '#FF8E53'],
    keywords: ['restaurant', 'cafe', 'pizza', 'burger', 'sushi', 'coffee', 'bakery',
               'food', 'drink', 'bar', 'pub', 'grill', 'kitchen', 'diner', 'bistro',
               'mcdonalds', 'starbucks', 'subway', 'kfc', 'dominos', 'swiggy', 'zomato'],
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: 'car',
    color: '#4ECDC4',
    gradientColors: ['#4ECDC4', '#44A8A1'],
    keywords: ['uber', 'lyft', 'ola', 'taxi', 'cab', 'bus', 'metro', 'train',
               'fuel', 'petrol', 'diesel', 'parking', 'toll', 'rapido', 'auto'],
  },
  {
    id: 'housing',
    label: 'Housing',
    icon: 'home',
    color: '#A29BFE',
    gradientColors: ['#A29BFE', '#6C5CE7'],
    keywords: ['rent', 'mortgage', 'airbnb', 'hotel', 'hostel', 'apartment',
               'maintenance', 'repair', 'plumber', 'electrician', 'cleaning'],
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    icon: 'game-controller',
    color: '#FD79A8',
    gradientColors: ['#FD79A8', '#E84393'],
    keywords: ['cinema', 'movie', 'theatre', 'concert', 'event', 'ticket',
               'netflix', 'spotify', 'gaming', 'bowling', 'arcade', 'escape room'],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: 'bag',
    color: '#FDCB6E',
    gradientColors: ['#FDCB6E', '#E17055'],
    keywords: ['amazon', 'flipkart', 'myntra', 'mall', 'store', 'shop',
               'clothes', 'shoes', 'electronics', 'gadget', 'supermarket', 'grocery'],
  },
  {
    id: 'health',
    label: 'Health',
    icon: 'medical',
    color: '#00CEC9',
    gradientColors: ['#00CEC9', '#00B894'],
    keywords: ['pharmacy', 'medicine', 'doctor', 'hospital', 'clinic', 'dentist',
               'chemist', 'lab', 'diagnostic', 'health', 'medical', 'drug'],
  },
  {
    id: 'travel',
    label: 'Travel',
    icon: 'airplane',
    color: '#74B9FF',
    gradientColors: ['#74B9FF', '#0984E3'],
    keywords: ['flight', 'airline', 'airport', 'visa', 'passport', 'tour',
               'makemytrip', 'goibibo', 'booking.com', 'expedia', 'holiday', 'trip'],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: 'flash',
    color: '#55EFC4',
    gradientColors: ['#55EFC4', '#00B894'],
    keywords: ['electricity', 'water', 'gas', 'internet', 'broadband', 'wifi',
               'phone', 'mobile', 'recharge', 'bill', 'utility', 'airtel', 'jio'],
  },
  {
    id: 'education',
    label: 'Education',
    icon: 'book',
    color: '#6C63FF',
    gradientColors: ['#6C63FF', '#5A52D5'],
    keywords: ['school', 'college', 'university', 'course', 'udemy', 'coursera',
               'tuition', 'book', 'stationery', 'pen', 'notebook', 'fees', 'exam'],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    icon: 'fitness',
    color: '#E17055',
    gradientColors: ['#E17055', '#D63031'],
    keywords: ['gym', 'yoga', 'fitness', 'cult', 'crossfit', 'swimming',
               'sports', 'equipment', 'protein', 'supplement', 'running'],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    icon: 'repeat',
    color: '#B2BEC3',
    gradientColors: ['#B2BEC3', '#636E72'],
    keywords: ['subscription', 'netflix', 'amazon prime', 'hotstar', 'youtube',
               'spotify', 'apple', 'google', 'microsoft', 'adobe', 'canva', 'monthly'],
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal',
    color: '#A7A6C5',
    gradientColors: ['#A7A6C5', '#74728F'],
    keywords: [],
  },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, Category>;

/**
 * Auto-detect category from OCR merchant text or expense title
 */
export function detectCategory(text: string): CategoryId {
  const lower = text.toLowerCase();
  for (const category of CATEGORIES) {
    if (category.id === 'other') continue;
    if (category.keywords.some((kw) => lower.includes(kw))) {
      return category.id;
    }
  }
  return 'other';
}
