import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Customer } from '../../types';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Cake, 
  Heart, 
  ShoppingBag, 
  Edit3, 
  Trash2, 
  Send,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { CustomerModal } from '../modals/CustomerModal';

export const CustomersView: React.FC = () => {
  const { customers, deleteCustomer } = useBakery();

  const [search, setSearch] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const currentMonth = new Date().getMonth() + 1;

  // Birthday customers this month
  const birthdayCustomers = customers.filter(c => {
    if (!c.birthDate) return false;
    const month = parseInt(c.birthDate.split('-')[1], 10);
    return month === currentMonth;
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenNew = () => {
    setCustomerToEdit(null);
    setIsCustomerModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsCustomerModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Excluir cliente "${name}" da base de contatos?`)) {
      deleteCustomer(id);
    }
  };

  const handleOpenWhatsApp = (phone: string, customerName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá, ${customerName}! Tudo bem? É da Confeitaria & Panificação Artesanal Saborê ✨ Passando para desejar um dia doce!`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DFD5]">
        <div>
          <h2 className="font-serif-brand text-2xl font-bold text-[#352527] dark:text-[#FFFFFF] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#B86B77]" />
            <span>Base de Clientes & CRM Saborê</span>
          </h2>
          <p className="text-xs text-[#7A6466]">
            Histórico de pedidos, preferências de confeitaria, bairros atendidos e datas de aniversário
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 rounded-xl bg-[#B86B77] hover:bg-[#9E5460] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Birthday Club Banner */}
      {birthdayCustomers.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FAF0F2] dark:bg-[#382B2E] border border-[#F2D7DA] dark:border-[#3F4147] text-xs text-[#553E41] dark:text-[#B5BAC1] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Cake className="w-5 h-5 text-[#B86B77] shrink-0" />
            <div>
              <strong className="text-[#352527] dark:text-[#FFFFFF]">Aniversariantes do Mês ({birthdayCustomers.length} clientes):</strong>{' '}
              <span>
                {birthdayCustomers.map(c => `${c.name} (${c.birthDate?.split('-')[2]}/${c.birthDate?.split('-')[1]})`).join(', ')}.
                Que tal enviar um cupom de 15% em bolos ou um mimo doce?
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#B86B77] shrink-0 bg-white dark:bg-[#2B2D31] px-3 py-1 rounded-md border border-[#EADBDB] dark:border-[#3F4147]">
            Fidelização Ativa
          </span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#FAF7F2] dark:bg-[#1E1F22] p-3 rounded-xl border border-[#E8DFD5] dark:border-[#3F4147]">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-[#9E898B] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou bairro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-[#1E1F22] rounded-lg border border-[#DACDC0] dark:border-[#3F4147] text-[#3D2C2E] dark:text-white"
          />
        </div>
        <span className="text-xs text-[#7A6466] dark:text-[#B5BAC1]">
          Total de clientes: <strong>{customers.length}</strong>
        </span>
      </div>

      {/* Customer Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-[#2B2D31] p-8 rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] text-center text-xs text-[#8C7678] dark:text-[#B5BAC1]">
          Nenhum cliente cadastrado na base de contatos. Novos clientes cadastrados em pedidos ou manualmente aparecerão aqui.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => (
            <div 
              key={customer.id} 
              className="bg-white dark:bg-[#2B2D31] rounded-2xl border border-[#E8DFD5] dark:border-[#3F4147] p-4 shadow-2xs space-y-3 flex flex-col justify-between text-xs"
            >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif-brand text-base font-bold text-[#352527] dark:text-[#FFFFFF]">
                    {customer.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#7A6466] dark:text-[#B5BAC1] mt-0.5">
                    <Phone className="w-3 h-3 text-[#B86B77]" />
                    <span>{customer.phone}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenWhatsApp(customer.phone, customer.name)}
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  title="Conversar no WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Address */}
              <div className="text-[11px] text-[#553E41] dark:text-[#B5BAC1] flex items-start gap-1">
                <MapPin className="w-3 h-3 text-stone-400 mt-0.5 shrink-0" />
                <span>{customer.address}, {customer.neighborhood}</span>
              </div>

              {/* Birthday */}
              {customer.birthDate && (
                <div className="text-[11px] text-[#B86B77] font-semibold flex items-center gap-1">
                  <Cake className="w-3 h-3 text-[#B86B77]" />
                  <span>Aniversário: {new Date(customer.birthDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                </div>
              )}

              {/* Favorites */}
              {customer.favoriteProducts.length > 0 && (
                <div className="pt-1">
                  <div className="text-[10px] text-[#8C7678] font-bold uppercase mb-1">Favoritos:</div>
                  <div className="flex flex-wrap gap-1">
                    {customer.favoriteProducts.map((p, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-[#FAF7F2] dark:bg-[#1E1F22] text-[#553E41] dark:text-[#B5BAC1] border border-[#E8DFD5] dark:border-[#3F4147] text-[10px]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {customer.notes && (
                <div className="p-2 rounded-lg bg-[#FAF8F5] dark:bg-[#1E1F22] border border-[#EADBDB] dark:border-[#3F4147] text-[11px] text-[#6E595B] dark:text-[#B5BAC1] italic">
                  "{customer.notes}"
                </div>
              )}
            </div>

            {/* Bottom Metrics & Actions */}
            <div className="pt-3 border-t border-[#F2ECE4] dark:border-[#3F4147] flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[#8C7678] dark:text-[#B5BAC1] block">Total Comprado (LTV)</span>
                <strong className="text-[#352527] dark:text-[#FFFFFF] font-bold font-mono">
                  R$ {(customer.totalSpent ?? 0).toFixed(2)} ({customer.totalOrders ?? 0} pedidos)
                </strong>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(customer)}
                  className="p-1.5 text-stone-400 dark:text-[#B5BAC1] hover:text-[#B86B77] dark:hover:text-[#B86B77] hover:bg-[#FAF0F2] dark:hover:bg-[#382B2E] rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(customer.id, customer.name)}
                  className="p-1.5 text-stone-400 dark:text-[#B5BAC1] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
      )}

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
      />

    </div>
  );
};
