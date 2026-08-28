'use client';

import React, { useState, useEffect } from 'react';
import { Delivery, User } from '@/types';
import { X, Save, AlertCircle, ShieldAlert, CheckCircle } from 'lucide-react';

interface EditModalProps {
  delivery: Delivery | null;
  activeUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const DeliveryEditModal: React.FC<EditModalProps> = ({
  delivery,
  activeUser,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<Delivery>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resolveMismatchChecked, setResolveMismatchChecked] = useState(false);

  useEffect(() => {
    if (delivery) {
      setFormData({
        diNo: delivery.diNo || '',
        invoiceNo: delivery.invoiceNo || '',
        date: delivery.date || '',
        buyerName: delivery.buyerName || '',
        transporterName: delivery.transporterName || '',
        truckNumber: delivery.truckNumber || '',
        driverContactNo: delivery.driverContactNo || '',
        lrNo: delivery.lrNo || '',
        freightOrder: delivery.freightOrder || '',
        toPlaceName: delivery.toPlaceName || '',
        address: delivery.address || '',
        itemName: delivery.itemName || '',
        drumQty: delivery.drumQty || '',
        deliveryStatus: delivery.deliveryStatus || '',
        remarks: delivery.remarks || '',
        deliveryRemarks: delivery.deliveryRemarks || '',
        vehicleReachedDate: delivery.vehicleReachedDate || '',
        deliveryDate: delivery.deliveryDate || '',
      });
      setResolveMismatchChecked(delivery.hasMismatch);
    }
    setErrorMessage('');
  }, [delivery]);

  if (!isOpen || !delivery) return null;

  const handleChange = (field: keyof Delivery, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) {
      setErrorMessage('Active user is not selected');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/deliveries/${delivery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: formData,
          activeUser,
          resolveMismatch: resolveMismatchChecked,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update record');
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg">
              ✏️
            </span>
            <div>
              <h3 className="font-bold text-base leading-tight">Edit Delivery Record</h3>
              <p className="text-xs text-slate-400">Invoice No: <span className="font-mono text-sky-300 font-bold">{delivery.invoiceNo}</span></p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mismatch Alert Notice */}
          {delivery.hasMismatch && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Detected Value Mismatch with Google Sheet</span>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={resolveMismatchChecked}
                  onChange={(e) => setResolveMismatchChecked(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span>Mark Mismatch as Resolved in PostgreSQL Database</span>
              </label>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            
            {/* DI NO */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(A) DI NO</label>
              <input
                type="text"
                value={formData.diNo || ''}
                onChange={(e) => handleChange('diNo', e.target.value)}
                placeholder="Enter DI NO"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* INVOICE NO */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(B) INVOICE NO *</label>
              <input
                type="text"
                required
                value={formData.invoiceNo || ''}
                onChange={(e) => handleChange('invoiceNo', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(C) Date</label>
              <input
                type="text"
                value={formData.date || ''}
                onChange={(e) => handleChange('date', e.target.value)}
                placeholder="e.g. 28-May-26"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Buyer Name */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">(D) Buyer Name</label>
              <input
                type="text"
                value={formData.buyerName || ''}
                onChange={(e) => handleChange('buyerName', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Transporter Name */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(E) Transporter Name</label>
              <input
                type="text"
                value={formData.transporterName || ''}
                onChange={(e) => handleChange('transporterName', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sky-800 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Truck Number */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(F) TRUCK NUMBER</label>
              <input
                type="text"
                value={formData.truckNumber || ''}
                onChange={(e) => handleChange('truckNumber', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Driver Contact */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(G) Driver Contact No</label>
              <input
                type="text"
                value={formData.driverContactNo || ''}
                onChange={(e) => handleChange('driverContactNo', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* LR. NO */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(H) LR. NO</label>
              <input
                type="text"
                value={formData.lrNo || ''}
                onChange={(e) => handleChange('lrNo', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* FREIGHT ORDER */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(I) FREIGHT ORDER</label>
              <input
                type="text"
                value={formData.freightOrder || ''}
                onChange={(e) => handleChange('freightOrder', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* To Place Name */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(J) To Place Name</label>
              <input
                type="text"
                value={formData.toPlaceName || ''}
                onChange={(e) => handleChange('toPlaceName', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* DELIVERY STATUS */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(N) DELIVERY STATUS</label>
              <select
                value={formData.deliveryStatus || ''}
                onChange={(e) => handleChange('deliveryStatus', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="PENDING">PENDING</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="VEHICLE REACHED">VEHICLE REACHED</option>
                <option value="IN TRANSIT">IN TRANSIT</option>
                <option value="CANCELED">CANCELED</option>
                <option value="LASER">LASER</option>
                <option value="kolkata port ( Export )">kolkata port ( Export )</option>
                <option value="BHUTAN">BHUTAN</option>
              </select>
            </div>

            {/* Address */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-bold mb-1">(K) Address</label>
              <textarea
                rows={2}
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Item Name */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">(L) Item Name</label>
              <input
                type="text"
                value={formData.itemName || ''}
                onChange={(e) => handleChange('itemName', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Drum Qty */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(M) Drum Qty</label>
              <input
                type="text"
                value={formData.drumQty || ''}
                onChange={(e) => handleChange('drumQty', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Remarks */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-bold mb-1">(O) Remarks</label>
              <input
                type="text"
                value={formData.remarks || ''}
                onChange={(e) => handleChange('remarks', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* DELIVERY REMARKS */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-bold mb-1">(P) DELIVERY REMARKS</label>
              <input
                type="text"
                value={formData.deliveryRemarks || ''}
                onChange={(e) => handleChange('deliveryRemarks', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* VEHICLE REACHED DATE */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(Q) VEHICLE REACHED DATE</label>
              <input
                type="text"
                value={formData.vehicleReachedDate || ''}
                onChange={(e) => handleChange('vehicleReachedDate', e.target.value)}
                placeholder="e.g. 29-05-2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* DELIVERY DATE */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">(R) DELIVERY DATE</label>
              <input
                type="text"
                value={formData.deliveryDate || ''}
                onChange={(e) => handleChange('deliveryDate', e.target.value)}
                placeholder="e.g. 29-05-2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

          </div>

          {/* Modal Footer / Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Editing as: <span className="font-semibold text-slate-800">{activeUser?.name}</span> ({activeUser?.role})
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
