import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function NewParcelForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [codAmount, setCodAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    const codItemPrice = Number(codAmount) || 0;
    const phoneStr = phone.trim();
    const nameStr = name.trim();

    // 1. Insert into Orders
    const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
      shop_id: user.id,
      customer_name: nameStr,
      phone_number: phoneStr,
      address: address,
      cod_amount: codItemPrice,
      source: 'EngazeUp Dashboard',
      status: 'pending'
    }]);

    if (orderError) {
      toast.error('অর্ডার সেভ করতে সমস্যা হয়েছে: ' + orderError.message);
      setIsSubmitting(false);
      return;
    }

    // 2. Manage Customer CRM
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, total_orders, total_spent')
      .eq('shop_id', user.id)
      .eq('phone', phoneStr)
      .single();

    if (existingCustomer) {
      await supabase.from('customers')
        .update({
          name: nameStr,
          address: address, // update latest address
          total_orders: existingCustomer.total_orders + 1,
          total_spent: existingCustomer.total_spent + codItemPrice
        })
        .eq('id', existingCustomer.id);
    } else {
      await supabase.from('customers').insert([{
        shop_id: user.id,
        name: nameStr,
        phone: phoneStr,
        address: address,
        total_orders: 1,
        total_spent: codItemPrice
      }]);
    }

    // 3. Trigger Edge Function for generic 3rd Party API mock (Steadfast placement / SMS trigger)
    // Replace this with actual Edge Function call when productionized
    // await fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/trigger-api', ...)
    
    setIsSubmitting(false);
    
    await MySwal.fire({
      icon: 'success',
      title: 'পার্সেল সফলভাবে এন্ট্রি হয়েছে!',
      html: `<div class="bg-gray-50 p-4 rounded-xl text-left border border-gray-100 mt-2">
               <span class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">SMS Triggered</span>
               <p class="text-sm font-medium text-gray-800">"প্রিয় ${nameStr}, আপনার ${codAmount} টাকার অর্ডারটি কনফার্ম হয়েছে।"</p>
             </div>`,
      confirmButtonColor: '#0F6E56',
      confirmButtonText: 'অর্ডার লিস্টে যান',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl font-bold px-6 py-2.5' }
    });

    navigate('/orders');
  };

  return (
    <DashboardLayout title="নতুন পার্সেল এন্ট্রি" subtitle="সরাসরি সিস্টেমে নতুন অর্ডার তৈরি করুন">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-[#0F6E56]" /> পার্সেলের বিস্তারিত তথ্য
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">কাস্টমার নাম *</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] outline-none transition" placeholder="মোঃ রহিম" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ফোন নম্বর *</label>
                  <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] outline-none transition font-en" placeholder="01XXX-XXXXXX" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ডেলিভারি অ্যাড্রেস *</label>
                <textarea required rows={3} value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] outline-none transition resize-none" placeholder="বাসা, ফ্ল্যাট নম্বর, রোড বা বিস্তারিত ঠিকানা..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cash on Delivery (COD) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-en font-medium">৳</span>
                    <input required type="number" value={codAmount} onChange={e => setCodAmount(e.target.value)} min="0" className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] outline-none transition font-en" placeholder="1500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">নোট (ঐচ্ছিক)</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0F6E56]/50 focus:border-[#0F6E56] outline-none transition" placeholder="যেকোনো অতিরিক্ত তথ্য..." />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button type="submit" disabled={isSubmitting} className="bg-[#0F6E56] hover:bg-[#1D9E75] text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-3 transition shadow-lg shadow-[#0F6E56]/20 disabled:opacity-75 transform active:scale-[0.98]">
                  {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> পার্সেল তৈরি হচ্ছে...</> : <><Send className="w-5 h-5" /> পার্সেল তৈরি করুন</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
