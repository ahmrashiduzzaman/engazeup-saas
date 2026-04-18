import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { statusBadgeTone, courierColors } from '../lib/utils';
import { Trash2, Truck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<string>('Steadfast');
  const [isBulkSending, setIsBulkSending] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('OrderList fetch error:', error);
      setFetchError(`ডাটা লোড করতে সমস্যা হয়েছে: ${error.message}`);
    } else {
      setOrders(data || []);
      setSelectedOrders([]); // Reset selection on fetch
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("আপনি কি নিশ্চিত যে এই অর্ডারটি মুছে ফেলতে চান?")) {
      const { error } = await supabase
        .from('orders')
        .update({ is_deleted: true })
        .eq('id', id);

      if (!error) fetchOrders();
    }
  };

  const toggleOrderSelection = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(orderId => orderId !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedOrders.length === pendingOrders.length && pendingOrders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map(o => o.id));
    }
  };

  const handleBulkSendToCourier = async () => {
    if (selectedOrders.length === 0) return;
    setIsBulkSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://otvzexarrpuaewjjdxna.supabase.co/functions/v1/send-courier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ orderIds: selectedOrders, courierName: selectedCourier })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send to courier');
      }

      toast.success(data.message || 'কুরিয়ারে সফলভাবে পাঠানো হয়েছে!');
      fetchOrders();
    } catch (err: any) {
      console.error('Send to courier error:', err);
      toast.error('সমস্যা হয়েছে: ' + err.message);
    } finally {
      setIsBulkSending(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status?.toLowerCase() === 'pending' || !o.tracking_id);

  const getFraudRisk = (phone: string, allOrders: any[]) => {
    if (!phone) return { icon: '🟡', label: 'অজানা', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    
    const history = allOrders.filter(o => o.phone_number === phone);
    const total = history.length;
    const returned = history.filter(o => {
      const s = String(o.status || '').toLowerCase();
      return s.includes('return') || s.includes('cancel') || s.includes('fail') || s.includes('reject');
    }).length;
    
    if (total <= 1) return { icon: '🟡', label: 'নতুন/সতর্ক', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    if (returned >= 2 || (total >= 3 && (returned / total) > 0.3)) return { icon: '🔴', label: 'ঝুঁকিপূর্ণ', color: 'text-red-700 bg-red-50 border-red-200' };
    if (returned > 0) return { icon: '🟡', label: 'রিটার্ন ইতিহাস', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    
    return { icon: '🟢', label: 'বিশ্বস্ত', color: 'text-green-700 bg-green-50 border-green-200' };
  };

  return (
    <DashboardLayout title="অর্ডার লিস্ট (Orders)" subtitle="আপনার সকল কুরিয়ারের অর্ডারের বিস্তারিত তালিকা">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 font-bengali">অর্ডার লোড হচ্ছে... ⏳</div>
        ) : fetchError ? (
          <div className="p-8 text-center">
            <p className="text-red-500 font-bold mb-2">⚠️ ডাটা লোড হয়নি</p>
            <p className="text-red-400 text-sm font-en mb-4">{fetchError}</p>
            <p className="text-gray-500 text-sm">সম্ভাব্য কারণ: orders টেবিলে shop_id কলামে ডাটা নেই। নিচের SQL রান করুন।</p>
            <code className="block mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-left font-en text-gray-700 whitespace-pre-wrap">{`UPDATE public.orders SET shop_id = '${user?.id}' WHERE shop_id IS NULL;`}</code>
          </div>
        ) : (
          <div>
            {pendingOrders.length > 0 && (
              <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                    নির্বাচিত: {selectedOrders.length}
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <select 
                    value={selectedCourier} 
                    onChange={e => setSelectedCourier(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-[#0F6E56] font-en"
                  >
                    <option value="Steadfast">Steadfast Courier</option>
                    <option value="Pathao">Pathao Courier</option>
                    <option value="RedX">RedX Courier</option>
                  </select>
                  <button 
                    onClick={handleBulkSendToCourier}
                    disabled={selectedOrders.length === 0 || isBulkSending}
                    className="bg-[#0F6E56] hover:bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition disabled:opacity-50 flex-1 md:flex-auto justify-center"
                  >
                    {isBulkSending ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                    <span className="hidden sm:inline">Send Selected to Courier</span>
                    <span className="sm:hidden">Send</span>
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm font-en">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-[#0F6E56] focus:ring-[#0F6E56] w-4 h-4 cursor-pointer"
                        checked={selectedOrders.length === pendingOrders.length && pendingOrders.length > 0}
                        onChange={toggleAllSelection}
                        disabled={pendingOrders.length === 0}
                      />
                    </th>
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium font-bengali">Customer</th>
                  <th className="p-4 font-medium">Phone</th>
                  <th className="p-4 font-medium text-center">Risk Score</th>
                  <th className="p-4 font-medium">Courier</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">COD Amount</th>
                  <th className="p-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-gray-400">
                      <p className="text-4xl mb-3">📭</p>
                      <p className="font-bold text-gray-600 mb-1">কোনো অর্ডার পাওয়া যায়নি</p>
                      <p className="text-sm">নতুন পার্সেল এন্ট্রি করলে এখানে দেখাবে।</p>
                    </td>
                  </tr>
                ) : orders.map((order) => (
                  <tr key={order.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedOrders.includes(order.id) ? 'bg-[#0F6E56]/5' : ''}`}>
                    <td className="p-4 text-center">
                      {(order.status?.toLowerCase() === 'pending' || !order.tracking_id) ? (
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-[#0F6E56] focus:ring-[#0F6E56] w-4 h-4 cursor-pointer"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                        />
                      ) : (
                        <div className="w-4 h-4 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-[10px]">✓</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-extrabold text-gray-900">{String(order.id).slice(0, 8).toUpperCase()}</td>
                    <td className="p-4 font-bold text-gray-700 font-bengali">{order.customer_name}</td>
                    <td className="p-4 text-gray-600 font-medium">{order.phone_number}</td>
                    <td className="p-4 text-center">
                      {(() => {
                        const risk = getFraudRisk(order.phone_number, orders);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold border rounded-full ${risk.color}`} title="AI Fraud Detection Score">
                            <span>{risk.icon}</span> {risk.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-4 font-extrabold" style={{ color: courierColors[order.source] || '#333' }}>{order.source}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusBadgeTone(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-extrabold text-[#0F6E56]">৳ {Number(order.cod_amount).toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-end gap-2 items-center">
                        {(order.tracking_id) ? (
                            <div className="text-right flex flex-col items-end">
                              <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md mb-1">Shipped</span>
                              <span className="text-[10px] text-gray-500 font-medium">Trk: {order.tracking_id}</span>
                            </div>
                        ) : null}
                        <button onClick={(e) => handleDelete(order.id, e)} className="p-1.5 bg-red-50 rounded hover:bg-red-500 hover:text-white text-red-500 transition" title="মুছে ফেলুন">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
