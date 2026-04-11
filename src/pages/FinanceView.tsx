import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function FinanceView() {
  const { user } = useAuth();
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchFinance = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', user.id)
        .eq('is_deleted', false);
        
      if (!error && data) {
        const aggregated: Record<string, any> = {};
        let tReceived = 0;
        let tPending = 0;

        data.forEach(order => {
          const courier = order.source || 'Other';
          const cod = Number(order.cod_amount) || 0;
          const status = order.status?.toLowerCase() || '';

          if (!aggregated[courier]) {
            aggregated[courier] = { name: courier, received: 0, pending: 0, overdue: 0 };
          }

          if (status === 'delivered') {
            aggregated[courier].received += cod;
            tReceived += cod;
          } else if (status === 'pending' || status.includes('transit')) {
            aggregated[courier].pending += cod;
            tPending += cod;
          } else if (status.includes('delay') || status.includes('hold')) {
            aggregated[courier].overdue += cod;
          }
        });

        setFinanceData(Object.values(aggregated));
        setTotalReceived(tReceived);
        setTotalPending(tPending);
      }
      setIsLoading(false);
    };

    fetchFinance();
  }, [user]);

  return (
    <DashboardLayout title="টাকার হিসাব (Finance)" subtitle="আপনার ফাইন্যান্সিয়াল রিপোর্ট এবং COD সেটেলমেন্ট">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
          <p className="text-gray-500 text-sm font-bold mb-2 font-bengali">সর্বমোট রিসিভড (Received)</p>
          <h3 className="text-4xl font-extrabold text-[#0F6E56] font-en">৳ {totalReceived.toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
          <p className="text-gray-500 text-sm font-bold mb-2 font-bengali">সর্বমোট পেন্ডিং (Pending)</p>
          <h3 className="text-4xl font-extrabold text-amber-500 font-en">৳ {totalPending.toLocaleString('en-IN')}</h3>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 font-bengali">লোড হচ্ছে... ⏳</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-sm font-en">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="p-4 font-medium">Courier Partner</th>
                  <th className="p-4 font-medium text-right">Received</th>
                  <th className="p-4 font-medium text-right">Pending</th>
                  <th className="p-4 font-medium text-right">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {financeData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">কোনো ডাটা পাওয়া যায়নি</td>
                  </tr>
                ) : financeData.map((data, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-extrabold text-gray-800">{data.name}</td>
                    <td className="p-4 text-right font-bold text-[#0F6E56]">৳ {data.received.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right font-bold text-amber-500">৳ {data.pending.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right font-bold text-red-500">৳ {data.overdue.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
