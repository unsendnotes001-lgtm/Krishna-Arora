
export type PaymentMethod = 'Cash' | 'UPI' | 'Cheque';

export interface User {
  name: string;
  email: string;
  picture: string;
  id: string;
}

export interface Transaction {
  id: string;
  date: string;
  customerName: string;
  bookTitle: string;
  totalPrice: number;
  amountPaid: number;
  balance: number;
  paymentMethod: PaymentMethod;
  chequeNumber?: string;
  notes?: string;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

export interface LedgerStats {
  totalSales: number;
  totalReceived: number;
  totalPending: number;
  transactionCount: number;
}
