
import React, { useState, useEffect } from 'react';
import { Transaction, PaymentMethod } from '../types';

interface TransactionFormProps {
  onSave: (transaction: Omit<Transaction, 'id' | 'balance' | 'status'>) => void;
  onCancel: () => void;
  initialData?: Transaction | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    bookTitle: '',
    totalPrice: '',
    amountPaid: '',
    paymentMethod: 'Cash' as PaymentMethod,
    chequeNumber: '',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date,
        customerName: initialData.customerName,
        bookTitle: initialData.bookTitle,
        totalPrice: initialData.totalPrice.toString(),
        amountPaid: initialData.amountPaid.toString(),
        paymentMethod: initialData.paymentMethod,
        chequeNumber: initialData.chequeNumber || '',
        notes: initialData.notes || ''
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: formData.date,
      customerName: formData.customerName,
      bookTitle: formData.bookTitle,
      totalPrice: Number(formData.totalPrice),
      amountPaid: Number(formData.amountPaid),
      paymentMethod: formData.paymentMethod,
      chequeNumber: formData.paymentMethod === 'Cheque' ? formData.chequeNumber : undefined,
      notes: formData.notes
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-2xl font-black text-slate-800 dark:text-white">
          {initialData ? 'Edit Record' : 'New Sale Entry'}
        </h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-2">
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1 tracking-wider">Date</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-800 dark:text-white"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1 tracking-wider">Customer Name</label>
          <input
            type="text"
            placeholder="e.g. Rahul Sharma"
            required
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-800 dark:text-white"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1 tracking-wider">Book / Item Description</label>
          <input
            type="text"
            placeholder="What did they buy?"
            required
            value={formData.bookTitle}
            onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1 tracking-wider">Total (₹)</label>
          <input
            type="number"
            placeholder="0.00"
            required
            min="0"
            value={formData.totalPrice}
            onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold text-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1 tracking-wider">Paid (₹)</label>
          <input
            type="number"
            placeholder="0.00"
            required
            min="0"
            value={formData.amountPaid}
            onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
            className="w-full p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition font-bold text-emerald-700 dark:text-emerald-400"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1 tracking-wider">Payment Method</label>
          <div className="flex gap-3">
            {(['Cash', 'UPI', 'Cheque'] as PaymentMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: method })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold transition flex items-center justify-center space-x-2 ${
                  formData.paymentMethod === method 
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' 
                    : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:border-slate-200'
                }`}
              >
                <i className={`fas ${method === 'Cash' ? 'fa-money-bill' : method === 'UPI' ? 'fa-mobile-screen' : 'fa-money-check-alt'}`}></i>
                <span>{method}</span>
              </button>
            ))}
          </div>
        </div>

        {formData.paymentMethod === 'Cheque' && (
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1 tracking-wider">Cheque Number</label>
            <input
              type="text"
              placeholder="Enter cheque number"
              required
              value={formData.chequeNumber}
              onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
              className="w-full p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition font-mono dark:text-white"
            />
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1 tracking-wider">Additional Notes (Optional)</label>
          <textarea
            placeholder="Add any specific details or reminders..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
           <span className="text-[10px] uppercase font-black text-slate-400 block tracking-widest">Balance Due</span>
           <span className={`text-2xl font-black ${Number(formData.totalPrice) - Number(formData.amountPaid) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
             ₹{(Number(formData.totalPrice || 0) - Number(formData.amountPaid || 0)).toLocaleString()}
           </span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-10 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition transform hover:-translate-y-1 active:translate-y-0"
          >
            {initialData ? 'Update Record' : 'Save Entry'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default TransactionForm;
