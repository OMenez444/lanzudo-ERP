/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, BedDouble, Users } from 'lucide-react';
import { Room, BedType } from '../types';

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  onSave: (id: string, data: Partial<Room>) => Promise<void>;
}

const BED_TYPES: { value: BedType; label: string; capacity: number }[] = [
  { value: '1_CASAL', label: '1 Cama de Casal', capacity: 2 },
  { value: '1_CASAL_1_SOLTEIRO', label: '1 Casal + 1 Solteiro', capacity: 3 },
  { value: '1_SOLTEIRO', label: '1 Cama de Solteiro', capacity: 1 },
  { value: '2_SOLTEIRO', label: '2 Camas de Solteiro', capacity: 2 },
];

export const EditRoomModal: React.FC<EditRoomModalProps> = ({ isOpen, onClose, room, onSave }) => {
  const [formData, setFormData] = useState({
    number: room?.number || '',
    type: room?.type || '',
    price: room?.price || 0,
    bedType: (room?.bedType || '1_CASAL') as BedType,
  });

  if (!isOpen || !room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(room.id, formData);
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
                <h3 className="text-2xl font-serif text-brand-cream">Editar Unidade</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Configuração de Acomodação</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Número</label>
                  <input 
                    type="text" 
                    value={formData.number}
                    onChange={e => setFormData({...formData, number: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Valor Diária (R$)</label>
                  <input 
                    type="number" 
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Nome da Suíte</label>
                <input 
                  type="text" 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Configuração de Camas</label>
                <div className="grid grid-cols-1 gap-2">
                  {BED_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({...formData, bedType: type.value})}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        formData.bedType === type.value 
                          ? 'bg-brand-gold/10 border-brand-gold/40 text-brand-gold' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <BedDouble size={18} />
                        <span className="text-sm font-bold uppercase tracking-tight">{type.label}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black opacity-60">
                        <Users size={12} /> MAX {type.capacity}
                      </div>
                    </button>
                  ))}
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
                  <Save size={16} /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
