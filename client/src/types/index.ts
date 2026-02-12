export type Role = 'ADMIN' | 'HQ' | 'BRANCH';

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  branchId: number | null;
  branchName: string | null;
}

export interface Branch {
  id: number;
  code: string;
  name: string;
  address?: string;
  manager?: string;
  phone?: string;
  isActive: boolean;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  category?: string;
  unit: string;
  price: number;
  isActive: boolean;
}

export interface OrderRound {
  id: number;
  roundNo: number;
  orderDate: string;
  memo?: string;
  items: OrderRoundItem[];
}

export interface OrderRoundItem {
  id: number;
  roundId: number;
  branchId: number;
  productId: number;
  quantity: number;
  branch: Branch;
  product: Product;
}

export interface Shipment {
  id: number;
  branchId: number;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  branch: Branch;
  items: ShipmentItem[];
  creator?: { name: string };
}

export interface ShipmentItem {
  id: number;
  productId: number;
  quantity: number;
  product: Product;
}

export interface InventoryItem {
  id: number;
  branchId: number;
  productId: number;
  totalOrdered: number;
  totalShipped: number;
  remaining: number;
  branch: Branch;
  product: Product;
}

export interface DashboardSummary {
  totalOrdered: number;
  totalShipped: number;
  remaining: number;
  shipmentRate: string;
}

export interface BranchProgress {
  branchId: number;
  branchName: string;
  branchCode: string;
  ordered: number;
  shipped: number;
  rate: number;
}
