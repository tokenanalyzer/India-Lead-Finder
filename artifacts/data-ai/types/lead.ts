export type LeadStatus = 'New' | 'Contacted' | 'Follow Up' | 'Proposal' | 'Won' | 'Lost';

export type ContactType = 'call' | 'whatsapp';

export interface ContactEntry {
  type: ContactType;
  at: string; // ISO timestamp
}

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
  contactLog?: ContactEntry[];
  /** ISO timestamp of the last time name/address/phone/rating were pulled live from Places API. */
  dataFetchedAt?: string;
}

/** Google's Places API terms allow caching most place fields for at most 30 days. */
const PLACES_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function isLeadDataStale(dataFetchedAt: string | undefined): boolean {
  if (!dataFetchedAt) return true;
  return Date.now() - new Date(dataFetchedAt).getTime() > PLACES_CACHE_MAX_AGE_MS;
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

export interface SavedSearch {
  id: string;
  label: string;
  category: string;
  /** Empty = GPS-based (re-fetches current location on each run). One = single city. Many = bulk. */
  cities: string[];
  createdAt: string;
  lastRunAt?: string;
  /** placeIds seen the last time this was run, for "N new since last time" diffing. */
  seenPlaceIds: string[];
}

export interface MessageTemplate {
  id: string;
  name: string;
  /** Empty string = applies to any category (fallback/default template). */
  category: string;
  /** Supports a {{business}} placeholder, replaced with the lead's name. */
  body: string;
}

export const DEFAULT_MESSAGE_TEMPLATE_BODY =
  'Hello, I came across your business "{{business}}" and would like to connect.';

export function renderMessageTemplate(body: string, businessName: string): string {
  return body.replace(/\{\{\s*business\s*\}\}/gi, businessName);
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

// Major cities and district-level towns across every Indian state and UT.
// Not exhaustive of every town in India — for anywhere not listed, use
// "Use my current location" in Search, which works off live GPS coordinates
// instead of this list.
export const INDIAN_CITIES = [
  // Andhra Pradesh
  'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry',
  'Kadapa', 'Kakinada', 'Tirupati', 'Anantapur', 'Vizianagaram', 'Eluru',
  'Ongole', 'Nandyal', 'Machilipatnam', 'Tenali', 'Proddatur', 'Chittoor',
  'Hindupur', 'Srikakulam',
  // Arunachal Pradesh
  'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro',
  // Assam
  'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur',
  'Bongaigaon', 'Karimganj', 'Sivasagar', 'Goalpara', 'Barpeta',
  // Bihar
  'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga',
  'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra',
  'Danapur', 'Saharsa', 'Hajipur', 'Sasaram', 'Dehri', 'Siwan', 'Motihari',
  'Nawada',
  // Chandigarh
  'Chandigarh',
  // Chhattisgarh
  'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur',
  'Raigarh', 'Ambikapur', 'Dhamtari',
  // Delhi
  'Delhi', 'New Delhi',
  // Goa
  'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda',
  // Gujarat
  'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
  'Junagadh', 'Gandhinagar', 'Anand', 'Nadiad', 'Morbi', 'Mehsana', 'Bharuch',
  'Vapi', 'Navsari', 'Surendranagar', 'Porbandar', 'Godhra', 'Patan',
  'Veraval', 'Valsad',
  // Haryana
  'Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak',
  'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh',
  'Jind', 'Kaithal', 'Rewari', 'Kurukshetra', 'Palwal',
  // Himachal Pradesh
  'Shimla', 'Solan', 'Dharamshala', 'Mandi', 'Kullu', 'Manali', 'Una',
  'Hamirpur', 'Chamba',
  // Jammu & Kashmir / Ladakh
  'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Leh',
  // Jharkhand
  'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh',
  'Giridih', 'Ramgarh', 'Medininagar', 'Chaibasa',
  // Karnataka
  'Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga',
  'Davanagere', 'Bellary', 'Bijapur', 'Shimoga', 'Tumkur', 'Raichur', 'Bidar',
  'Hospet', 'Hassan', 'Udupi', 'Chitradurga', 'Kolar', 'Mandya', 'Gadag',
  'Chikmagalur',
  // Kerala
  'Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur',
  'Alappuzha', 'Palakkad', 'Malappuram', 'Kottayam', 'Kasaragod',
  'Pathanamthitta', 'Idukki', 'Manjeri',
  // Madhya Pradesh
  'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas',
  'Satna', 'Ratlam', 'Rewa', 'Murwara', 'Singrauli', 'Burhanpur', 'Khandwa',
  'Chhindwara', 'Guna', 'Vidisha', 'Shivpuri', 'Damoh', 'Neemuch', 'Mandsaur',
  // Maharashtra
  'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur',
  'Kolhapur', 'Amravati', 'Nanded', 'Sangli', 'Malegaon', 'Akola', 'Latur',
  'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Jalgaon', 'Bhiwandi',
  'Ichalkaranji', 'Panvel', 'Satara', 'Beed', 'Yavatmal', 'Osmanabad',
  'Wardha', 'Ratnagiri', 'Nandurbar', 'Gondia', 'Navi Mumbai', 'Kalyan',
  'Vasai-Virar',
  // Manipur
  'Imphal', 'Thoubal', 'Bishnupur',
  // Meghalaya
  'Shillong', 'Tura', 'Jowai',
  // Mizoram
  'Aizawl', 'Lunglei',
  // Nagaland
  'Kohima', 'Dimapur', 'Mokokchung',
  // Odisha
  'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri',
  'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Angul',
  // Puducherry
  'Puducherry', 'Karaikal',
  // Punjab
  'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali',
  'Hoshiarpur', 'Batala', 'Pathankot', 'Moga', 'Firozpur', 'Abohar',
  'Kapurthala', 'Barnala', 'Sangrur', 'Rupnagar',
  // Rajasthan
  'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara',
  'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Tonk',
  'Kishangarh', 'Beawar', 'Hanumangarh', 'Dholpur', 'Nagaur', 'Churu',
  'Jhunjhunu', 'Barmer', 'Banswara', 'Chittorgarh',
  // Sikkim
  'Gangtok', 'Namchi',
  // Tamil Nadu
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul',
  'Thanjavur', 'Nagercoil', 'Kanchipuram', 'Karur', 'Cuddalore', 'Kumbakonam',
  'Hosur', 'Sivakasi', 'Namakkal', 'Rajapalayam',
  // Telangana
  'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam',
  'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Siddipet',
  'Miryalaguda', 'Secunderabad',
  // Tripura
  'Agartala', 'Udaipur (Tripura)', 'Dharmanagar',
  // Uttar Pradesh
  'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Meerut', 'Varanasi', 'Prayagraj',
  'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida',
  'Greater Noida', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura',
  'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Ayodhya', 'Bulandshahr',
  'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Sitapur',
  'Bahraich', 'Modinagar', 'Unnao', 'Jaunpur', 'Ghazipur', 'Mirzapur',
  'Etawah', 'Mainpuri', 'Deoria', 'Basti', 'Azamgarh', 'Bijnor', 'Budaun',
  // Uttarakhand
  'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur',
  'Rishikesh', 'Nainital', 'Almora', 'Pithoragarh',
  // West Bengal
  'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman',
  'Malda', 'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Ranaghat',
  'Krishnanagar', 'Nabadwip', 'Balurghat', 'Basirhat', 'Jalpaiguri',
  'Cooch Behar', 'Darjeeling', 'Raiganj', 'Bankura', 'Purulia', 'Medinipur',
  // Andaman & Nicobar / Dadra and Nagar Haveli and Daman and Diu
  'Port Blair', 'Daman', 'Diu', 'Silvassa',
];

export const BUSINESS_CATEGORIES = [
  // Health & wellness
  'Dental Clinic', 'Medical Clinic', 'Hospital', 'Nursing Home',
  'Diagnostic Center', 'Pathology Lab', 'Veterinary Clinic',
  'Physiotherapy Clinic', 'Ayurvedic Clinic', 'Homeopathy Clinic',
  'Skin Clinic', 'Eye Hospital', 'IVF Clinic', 'Maternity Hospital',
  'Blood Bank', 'Gym', 'Yoga Studio', 'Massage Center',
  // Beauty & personal care
  'Hair Salon', 'Beauty Parlour', 'Spa', 'Nail Salon', 'Barber Shop',
  'Tattoo Studio',
  // Food & hospitality
  'Restaurant', 'Cafe', 'Hotel', 'Bakery', 'Sweet Shop', 'Catering Service',
  'Ice Cream Parlour', 'Juice Bar', 'Banquet Hall', 'Guest House', 'Resort',
  'PG Accommodation', 'Dhaba',
  // Professional & financial services
  'Real Estate Agent', 'Law Firm', 'CA Office', 'Chartered Accountant',
  'Tax Consultant', 'Financial Advisor', 'Loan Agent', 'Insurance Agency',
  'Architect', 'Civil Contractor', 'Digital Marketing Agency',
  'Web Design Agency', 'Advertising Agency', 'HR Consultancy',
  'Recruitment Agency', 'Immigration Consultant', 'Notary',
  // Tech & retail
  'IT Company', 'Mobile Shop', 'Mobile Repair Shop', 'Laptop Repair Shop',
  'Electronics Store', 'Cyber Cafe', 'Co-working Space',
  'Clothing Store', 'Footwear Store', 'Jewellery Store', 'Watch Shop',
  'Cosmetics Store', 'Bookstore', 'Stationery Shop', 'Toy Store',
  'Sports Goods Store', 'Gift Shop', 'Grocery Store', 'Supermarket',
  'Pharmacy', 'Furniture Store', 'Flower Shop', 'Pet Shop', 'Optician',
  // Home & trade services
  'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Pest Control Service',
  'AC Repair Service', 'Appliance Repair Shop', 'Security Services',
  'Packers and Movers', 'Cleaning Service', 'Water Purifier Dealer',
  'Solar Panel Installer', 'CCTV Dealer', 'Interior Designer',
  'Hardware Store', 'Paint Shop', 'Tile Shop',
  // Automobile
  'Auto Repair Shop', 'Car Showroom', 'Bike Showroom', 'Car Wash',
  'Car Rental', 'Bike Repair Shop', 'Spare Parts Shop', 'Tyre Shop',
  'Battery Shop', 'Petrol Pump',
  // Education & creative
  'School', 'Preschool', 'Coaching Center', 'Tuition Center', 'Music School',
  'Dance Academy', 'Driving School', 'Computer Training Institute',
  'Language Institute', 'Library', 'Photography Studio', 'Event Planner',
  'Wedding Planner', 'Astrologer',
  // Other services
  'Travel Agency', 'Printing Shop', 'Laundry', 'Tailor Shop',
  'Courier Service', 'Logistics Company', 'NGO', 'Gaming Zone',
  'Movie Theatre', 'Party Hall',
];

/** Returns human-readable "2h ago", "3d ago" etc. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
