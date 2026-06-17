export type LeadStatus = 'New' | 'Contacted' | 'Follow Up' | 'Proposal' | 'Won' | 'Lost';

export interface Lead {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  totalRatings: number;
  category: string;
  city: string;
  status: LeadStatus;
  notes: string;
  tags: string[];
  savedAt: string;
  placeId: string;
  lat?: number;
  lng?: number;
}

export interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  totalRatings: number;
  lat?: number;
  lng?: number;
}

export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string }> = {
  'New':        { bg: '#3B82F6', text: '#FFFFFF' },
  'Contacted':  { bg: '#8B5CF6', text: '#FFFFFF' },
  'Follow Up':  { bg: '#F59E0B', text: '#FFFFFF' },
  'Proposal':   { bg: '#F97316', text: '#FFFFFF' },
  'Won':        { bg: '#22C55E', text: '#FFFFFF' },
  'Lost':       { bg: '#EF4444', text: '#FFFFFF' },
};

export const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Follow Up', 'Proposal', 'Won', 'Lost'];

export const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
  'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Thane', 'Bhopal', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra',
  'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Aurangabad',
  'Visakhapatnam', 'Amritsar', 'Ranchi', 'Jabalpur', 'Gwalior', 'Vijayawada',
  'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Chandigarh', 'Coimbatore', 'Srinagar',
  'Dehradun', 'Mysore', 'Noida', 'Gurgaon', 'Guwahati', 'Tiruchirappalli',
  'Bhubaneswar', 'Kochi', 'Thiruvananthapuram', 'Mangalore',
];

export const BUSINESS_CATEGORIES = [
  'Dental Clinic', 'Medical Clinic', 'Hospital', 'Gym', 'Yoga Studio',
  'Hair Salon', 'Beauty Parlour', 'Spa', 'Restaurant', 'Cafe', 'Hotel',
  'Real Estate Agent', 'Law Firm', 'CA Office', 'Chartered Accountant',
  'IT Company', 'Mobile Shop', 'Electronics Store', 'Clothing Store',
  'Jewellery Store', 'Pharmacy', 'Auto Repair Shop', 'Plumber', 'Electrician',
  'Interior Designer', 'Photography Studio', 'Event Planner', 'Travel Agency',
  'Insurance Agency', 'School', 'Coaching Center', 'Bakery', 'Supermarket',
  'Hardware Store', 'Printing Shop', 'Laundry', 'Tailor Shop',
  'Furniture Store', 'Flower Shop', 'Pet Shop', 'Optician',
];
