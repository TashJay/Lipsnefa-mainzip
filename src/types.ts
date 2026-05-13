/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  STAFF = 'STAFF',
  SUPERVISOR = 'SUPERVISOR',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
}

export enum ProductType {
  DRINK = 'DRINK',
  FOOD = 'FOOD',
  ROOM = 'ROOM',
  SERVICE = 'SERVICE'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  isQuickSell: boolean;
  type?: ProductType;
}

export enum TabStatus {
  OPEN = 'OPEN',
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

export interface TabItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtSale: number;
}

export interface Tab {
  id: string;
  staffId: string;
  customerName: string;
  items: TabItem[];
  total: number;
  status: TabStatus;
  mpesaPhone?: string;
  paymentType?: 'Cash' | 'M-Pesa' | 'Card';
  isDebt: boolean;
  createdAt: number;
  updatedAt: number;
  roomId?: string;
  isCarwash?: boolean;
}

export interface Room {
  id: string;
  number: string;
  type: string;
  price: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
}

export interface AuditLog {
  id: string;
  userName: string;
  userId: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface InventoryItem extends Product {}
