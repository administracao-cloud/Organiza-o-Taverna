import React, { useState, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Customer } from '../../types';
import { X, User, Heart } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit
}) => {
  const { addCustomer, updateCustomer } = useBakery();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [favoriteProducts, setFavoriteProducts] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone);
      setEmail(customerToEdit.email || '');
      setAddress(customerToEdit.address);
      setNeighborhood(customerToEdit.neighborhood);
      setBirthDate(customerToEdit.birthDate || '');
      setFavoriteProducts(customerToEdit.favoriteProducts.join(', '));
      setNotes(customerToEdit.notes || '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNeighborhood('');
      setBirthDate('');
      setFavoriteProducts('');
      setNotes('');
    }
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Nome e Telefone são obrigatórios.');
      return;
    }

    const favList = favoriteProducts
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const customerData = {
      name,
      phone,
      email: email.trim() || undefined,
      address,
      neighborhood,
      birthDate: birthDate || undefined,
      favoriteProducts: favList,
      notes: notes.trim() || undefined
    };

    if (customerToEdit) {
      updateCustomer(customerToEdit.id, customerData);
    } else {
      addCustomer(customerData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#FAF7F2] dark:bg-[#2B2D31] rounded-2xl border border-[#E5DACF] dark:border-[#3F4147] shadow-xl w-full max-w-lg overflow-hidden">
        
        <div className="px-6 py-4 border-b border-[#EBE1D7] dark:border-[#3F4147] flex items-center justify-between bg-[#F4EFEA] dark:bg-[#1E1F22]">
          <div>
            <h2 className="font-serif-brand text-xl font-bold text-[#382628] dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#B86B77]" />
              <span>{customerToEdit ? 'Editar Cliente' : 'Novo Cliente Saborê'}</span>
            </h2>
            <p className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
              CRM com dados de entrega, aniversários e preferências de confeitaria
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A6466] dark:text-[#B5BAC1] hover:bg-[#EAE0D5] dark:hover:bg-[#35373C]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Beatriz Fontes"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Telefone / WhatsApp *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(11) 98114-5520"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Data de Aniversário</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Endereço Completo</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Rua, número, complemento"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#543E40] mb-1">Bairro</label>
              <input
                type="text"
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value)}
                placeholder="Ex: Pinheiros"
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Produtos Favoritos (separados por vírgula)</label>
            <input
              type="text"
              value={favoriteProducts}
              onChange={e => setFavoriteProducts(e.target.value)}
              placeholder="Ex: Croissant Francês, Sourdough Rústico, Bolo Red Velvet"
              className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#543E40] mb-1">Observações de Preferência ou Restrições</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Alérgico a castanhas; prefere pão bem assado e crocante; gosta de cartão comemorativo."
              className="w-full text-xs p-2.5 bg-white rounded-lg border border-[#DACDC0] text-[#3D2C2E] dark:text-white"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#D5C5B5] bg-white text-[#553F41]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white shadow-xs"
            >
              Salvar Cliente
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
