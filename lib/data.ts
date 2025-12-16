export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  condition: "New" | "Excellent" | "Very Good" | "Good";
  size: string;
  category: "Trainers" | "Streetwear" | "Luxury";
  images: string[];
  seller: Seller;
  authenticated: boolean;
  description: string;
  colorway?: string;
  releaseYear?: number;
  featured?: boolean;
};

export type Seller = {
  id: string;
  name: string;
  verified: boolean;
  rating: number;
  totalSales: number;
  totalValue: number;
  joinedDate: string;
  specialization: string;
  avatar?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string;
  tagline: string;
};

export const sellers: Seller[] = [
  {
    id: "1",
    name: "Elite Vault",
    verified: true,
    rating: 4.9,
    totalSales: 342,
    totalValue: 487600,
    joinedDate: "2023-01-15",
    specialization: "Archive trainers and limited releases",
  },
  {
    id: "2",
    name: "Prestige Collective",
    verified: true,
    rating: 4.8,
    totalSales: 218,
    totalValue: 312400,
    joinedDate: "2023-03-22",
    specialization: "Luxury handbags and accessories",
  },
  {
    id: "3",
    name: "Archive Curators",
    verified: true,
    rating: 5.0,
    totalSales: 156,
    totalValue: 268900,
    joinedDate: "2023-06-10",
    specialization: "Streetwear from private collections",
  },
];

export const products: Product[] = [
  {
    id: "1",
    name: "Air Jordan 1 Retro High OG",
    brand: "Nike",
    price: 1250,
    originalPrice: 1450,
    condition: "Excellent",
    size: "UK 9",
    category: "Trainers",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80",
    ],
    seller: sellers[0],
    authenticated: true,
    description: "Iconic silhouette in pristine condition. Authenticated by our expert team. Minimal wear, original box included.",
    colorway: "Chicago",
    releaseYear: 2015,
    featured: true,
  },
  {
    id: "2",
    name: "Dior B23 High-Top Sneaker",
    brand: "Dior",
    price: 3200,
    condition: "New",
    size: "UK 10",
    category: "Luxury",
    images: [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80",
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80",
    ],
    seller: sellers[1],
    authenticated: true,
    description: "Unworn Dior B23 high-tops with signature oblique canvas. Complete with original packaging and authentication cards.",
    featured: true,
  },
  {
    id: "3",
    name: "Supreme Box Logo Hoodie",
    brand: "Supreme",
    price: 890,
    condition: "Very Good",
    size: "L",
    category: "Streetwear",
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80",
    ],
    seller: sellers[2],
    authenticated: true,
    description: "Classic Supreme Box Logo hoodie from FW17. Minimal signs of wear, no cracking on print. Authenticated.",
    releaseYear: 2017,
  },
  {
    id: "4",
    name: "Yeezy Boost 350 V2",
    brand: "Adidas",
    price: 425,
    condition: "Excellent",
    size: "UK 8.5",
    category: "Trainers",
    images: [
      "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80",
    ],
    seller: sellers[0],
    authenticated: true,
    description: "Yeezy Boost 350 V2 in excellent condition. Authenticated with original box and tags.",
    colorway: "Zebra",
    releaseYear: 2022,
  },
  {
    id: "5",
    name: "Louis Vuitton Keepall 50",
    brand: "Louis Vuitton",
    price: 2150,
    condition: "Excellent",
    size: "50cm",
    category: "Luxury",
    images: [
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80",
    ],
    seller: sellers[1],
    authenticated: true,
    description: "Iconic Louis Vuitton Keepall 50 in monogram canvas. Authenticated by our luxury goods specialists.",
    featured: true,
  },
  {
    id: "6",
    name: "Off-White Industrial Belt",
    brand: "Off-White",
    price: 185,
    condition: "New",
    size: "One Size",
    category: "Streetwear",
    images: [
      "https://images.unsplash.com/photo-1624222247344-550fb60583c2?w=800&q=80",
    ],
    seller: sellers[2],
    authenticated: true,
    description: "Unworn Off-White industrial belt with original tags. Classic yellow colorway.",
  },
  {
    id: "7",
    name: "Travis Scott x Nike SB Dunk Low",
    brand: "Nike",
    price: 1850,
    condition: "New",
    size: "UK 9.5",
    category: "Trainers",
    images: [
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80",
    ],
    seller: sellers[0],
    authenticated: true,
    description: "Deadstock Travis Scott collaboration. Complete with all accessories and special packaging.",
    colorway: "Cactus Jack",
    releaseYear: 2020,
    featured: true,
  },
  {
    id: "8",
    name: "Balenciaga Triple S",
    brand: "Balenciaga",
    price: 695,
    condition: "Very Good",
    size: "UK 11",
    category: "Luxury",
    images: [
      "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=800&q=80",
    ],
    seller: sellers[1],
    authenticated: true,
    description: "Balenciaga Triple S in excellent pre-owned condition. Authenticated with original box.",
  },
];

export const categories: Category[] = [
  {
    id: "1",
    name: "Trainers",
    slug: "trainers",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    tagline: "Performance meets rarity",
  },
  {
    id: "2",
    name: "Streetwear",
    slug: "streetwear",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80",
    tagline: "Culture. Scarcity. Demand.",
  },
  {
    id: "3",
    name: "Luxury",
    slug: "luxury",
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80",
    tagline: "Timeless assets, not accessories",
  },
];

export const trustPillars = [
  {
    title: "Authentication Guarantee",
    description: "Every item verified by industry experts before listing",
  },
  {
    title: "Curated Sellers",
    description: "Invitation-only marketplace for trusted vendors",
  },
  {
    title: "Secure Transactions",
    description: "Protected payments with buyer guarantee",
  },
  {
    title: "White Glove Service",
    description: "Premium packaging and insured shipping",
  },
];
