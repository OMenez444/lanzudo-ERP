/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, User, Mail, Phone, MapPin } from 'lucide-react';
import { Guest } from '../types';

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Guest, 'id'>) => Promise<void>;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    document: '', // Adding a field for identification
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    setFormData({ fullName: '', email: '', phone: '', document: '' });
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
                <h3 className="text-2xl font-serif text-brand-cream">Novo Hóspede</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Cadastro de Hóspedes Lanzudo's</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase text-slate-500 font-black tracking-widest px-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold/50" size={18} />
                  <input 
                    type="text" 
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                    placeholder="Nome completo do hóspede"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-slate-500 font-black tracking-widest px-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold/50" size={18} />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-slate-500 font-black tracking-widest px-1">Telefone / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold/50" size={18} />
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-slate-500 font-black tracking-widest px-1">CPF / Passaporte</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold/50" size={18} />
                  <input 
                    type="text" 
                    value={formData.document}
                    onChange={e => setFormData({...formData, document: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                    placeholder="Documento de identificação"
                  />
                </div>
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
                  <UserPlus size={16} /> Cadastrar Hóspede
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
