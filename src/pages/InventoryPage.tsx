import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Package, Plus, Minus, Trash2, X } from 'lucide-react';

export default function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ sku: '', name: '', price: '', stock: '' });

  const fetchInventory = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (!error) setProducts(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, [user]);

  const handleAddProduct = async (e: any) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('products').insert([{
      shop_id: user.id,
      sku: newProduct.sku,
      name: newProduct.name,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      status: Number(newProduct.stock) > 0 ? 'In Stock' : 'Out of Stock'
    }]);

    if (!error) {
      setShowModal(false);
      setNewProduct({ sku: '', name: '', price: '', stock: '' });
      fetchInventory();
    } else {
      alert("প্রোডাক্ট যোগ করতে সমস্যা হয়েছে: " + error.message);
    }
  };

  const handleUpdateStock = async (id: string, currentStock: number, change: number) => {
    const newStock = currentStock + change;
    if (newStock < 0) return;

    const status = newStock > 20 ? 'In Stock' : newStock > 0 ? 'Low Stock' : 'Out of Stock';

    const { error } = await supabase
      .from('products')
      .update({ stock: newStock, status: status })
      .eq('id', id);

    if (!error) fetchInventory();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("আপনি কি নিশ্চিত যে এই প্রোডাক্টটি মুছে ফেলতে চান?")) {
      const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('id', id);
        
      if (!error) fetchInventory();
    }
  };

  return (
    <DashboardLayout title="স্টক ও ইনভেন্টরি" subtitle="আপনার প্রোডাক্ট ম্যানেজ করুন">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-700 font-bengali">প্রোডাক্ট ডাটাবেস</h3>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#0F6E56] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1D9E75] transition shadow-sm">
            <Package className="w-5 h-5" /> নতুন প্রোডাক্ট
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-500 font-bengali">ডাটাবেস থেকে লোড হচ্ছে... ⏳</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
              <thead className="bg-white border-b text-gray-600">
                <tr>
                  <th className="p-4 font-medium">SKU</th>
                  <th className="p-4 font-medium font-bengali">প্রোডাক্টের নাম</th>
                  <th className="p-4 font-medium text-right">দাম</th>
                  <th className="p-4 font-medium text-center">স্ট্যাটাস</th>
                  <th className="p-4 font-medium text-center">স্টক ম্যানেজমেন্ট</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">কোনো প্রোডাক্ট পাওয়া যায়নি</td>
                  </tr>
                ) : products.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-extrabold text-gray-900">{item.sku}</td>
                    <td className="p-4 font-bold text-gray-800 font-bengali">{item.name}</td>
                    <td className="p-4 text-right font-medium text-gray-600">৳ {item.price}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${item.stock > 20 ? 'bg-green-100 text-green-700' :
                        item.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {item.stock} পিচ ({item.stock > 20 ? 'In Stock' : item.stock > 0 ? 'Low Stock' : 'Out of Stock'})
                      </span>
                    </td>
                    <td className="p-4 text-center flex items-center justify-center gap-3">
                      <button onClick={() => handleUpdateStock(item.id, item.stock, -1)} className="p-1.5 bg-gray-100 rounded hover:bg-red-100 text-red-600 transition" title="স্টক কমান">
                        <Minus size={16} />
                      </button>
                      <button onClick={() => handleUpdateStock(item.id, item.stock, 1)} className="p-1.5 bg-gray-100 rounded hover:bg-green-100 text-green-600 transition" title="স্টক বাড়ান">
                        <Plus size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 ml-2 bg-red-50 rounded hover:bg-red-500 hover:text-white text-red-500 transition" title="ডিলিট করুন">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={24} /></button>
            <h2 className="text-xl font-bold mb-6 font-bengali text-gray-800 flex items-center gap-2"><Package className="text-[#0F6E56]" /> নতুন প্রোডাক্ট যুক্ত করুন</h2>

            <form onSubmit={handleAddProduct} className="space-y-4 font-bengali">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">SKU / প্রোডাক্ট আইডি</label>
                <input required type="text" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]" placeholder="যেমন: TSHIRT-01" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">প্রোডাক্টের নাম</label>
                <input required type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#0F6E56]" placeholder="প্রোডাক্টের পুরো নাম লিখুন" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">বিক্রয় মূল্য (৳)</label>
                  <input required type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#0F6E56]" placeholder="0.00" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">প্রাথমিক স্টক (পিচ)</label>
                  <input required type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#0F6E56]" placeholder="কত পিস আছে?" />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#0F6E56] text-white py-3 rounded-xl font-bold mt-4 hover:bg-[#1D9E75] transition shadow-md">
                প্রোডাক্ট সেভ করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
