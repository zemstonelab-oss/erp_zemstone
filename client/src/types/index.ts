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

export type DeliveryStatus = 'PENDING' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: '접수',
  PREPARING: '준비중',
  IN_TRANSIT: '배송중',
  DELIVERED: '배송완료',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  PENDING: 'bg-gray-200 text-gray-700',
  PREPARING: 'bg-yellow-200 text-yellow-800',
  IN_TRANSIT: 'bg-blue-200 text-blue-800',
  DELIVERED: 'bg-green-200 text-green-800',
};

export interface Shipment {
  id: number;
  branchId: number;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  branch: Branch;
  items: ShipmentItem[];
  creator?: { name: string };
  deliveryStatus: DeliveryStatus;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  deliveredAt?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
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

export interface ExtraOrderRequest {
  id: number;
  branchId: number;
  productId: number;
  quantity: number;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy?: number;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
  branch: Branch;
  product: Product;
  requester?: { name: string };
  reviewer?: { name: string };
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title?: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AlertThreshold {
  id: number;
  branchId: number;
  productId: number;
  threshold: number;
  branch: Branch;
  product: Product;
}

export interface PaginatedShipments {
  data: Shipment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: Role;
  branchId: number | null;
  isActive: boolean;
  createdAt: string;
  branch?: { name: string };
}
