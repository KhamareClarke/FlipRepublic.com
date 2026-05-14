export type Role = "buyer" | "seller" | "admin";

export type Profile = {
  user_id: string;
  username: string | null;
  role: Role;
  is_verified: boolean;
  is_banned: boolean;
  created_at: string;
};

export type SellerApplicationStatus = "pending" | "approved" | "rejected";

export type SellerApplication = {
  id: string;
  user_id: string;
  identity_info: Record<string, string | null> | null;
  store_info: Record<string, string | null> | null;
  banking_info: Record<string, string | null> | null;
  status: SellerApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  tagline: string | null;
  created_at: string;
};

export type ProductStatus = "draft" | "active" | "sold" | "under_review";

export type Product = {
  id: string;
  seller_id: string;
  category_id: string | null;
  name: string;
  brand: string;
  condition: string;
  size: string;
  price: number;
  authenticated: boolean;
  status: ProductStatus;
  description: string | null;
  colorway: string | null;
  release_year: number | null;
  sku?: string | null;
  stock_quantity?: number;
  track_inventory?: boolean;
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
  created_at: string;
};

export type ProductWithImages = Product & {
  images: ProductImage[];
  seller: Profile | null;
  category: Category | null;
};

export type TrustPillar = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

export type OrderStatus = "paid" | "shipped" | "completed" | "refunded";

export type Order = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  amount: number;
  status: OrderStatus;
  stripe_session_id: string | null;
  created_at: string;
};

export type OfferStatus = "pending" | "accepted" | "rejected" | "countered" | "withdrawn";

export type Offer = {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  offer_price: number;
  status: OfferStatus;
  created_at: string;
};

export type SavedProduct = {
  user_id: string;
  product_id: string;
  created_at: string;
};

export type PayoutStatus = "pending" | "completed" | "failed";

export type Payout = {
  id: string;
  seller_id: string;
  amount: number;
  status: PayoutStatus;
  method: string;
  created_at: string;
};
