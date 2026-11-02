export interface Category {
  id: string;
  name: string;
  pageNumber: string;
  pdfPage: number;
  color: string;
  textColor?: string;
  imageUrl: string;
  description: string;
}

export interface Product {
  id: string;
  clave: string;
  name: string;
  subtitle: string;
  description: string;
  presentation: string;
  price: number;
  categoryId: string;
  catalogPage: string;
  imageUrl: string;
  featured?: boolean;
  priceTagStyle?: 'blue' | 'emerald' | 'rose' | 'amber' | 'purple' | 'dark';
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CatalogData {
  categories: Category[];
  products: Product[];
  whatsappNumber: string;
  distributorName: string;
  distributorLocation: string;
  lastUpdated: string;
}

export interface AdminStatus {
  isAdminConnected: boolean;
  connectedSince: number | null;
  activeUsersCount: number;
}
