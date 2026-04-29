/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, ShoppingBag, DollarSign } from 'lucide-react';
import { Product } from '../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Product, 'id'>) => Promise<void>;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    description: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    setFormData({ name: '', price: 0, description: '' });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-brand-slate border border-brand-gold/10 rounded-[32px] overflow-hidden shadow-2xl"
        >
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-serif text-brand-cream">Novo Produto</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Cadastro de Itens de Consumo</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Nome do Produto</label>
                <div className="relative">
                  <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold/50" size={18} />
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                    placeholder="Ex: Cerbeja Artesanal"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Preço Unitário (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500/50" size={18} />
                  <input 
                    type="number" 
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={4}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white resize-none"
                  placeholder="Informações adicionais sobre o produto..."
                />
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-4 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-brand-gold text-brand-bg py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-gold/20"
                >
                  <Plus size={16} /> Adicionar ao Catálogo
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
