import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { TrendingUp } from 'lucide-react';

export default function AdminPanel() {
  return (
    <DashboardLayout title="অ্যাডমিন প্যানেল" subtitle="প্লাটফর্ম ওভারভিউ এবং ইউজার ম্যানেজমেন্ট">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-[#0F6E56]">
          <p className="text-gray-500 text-sm font-medium mb-1">Monthly Recurring Revenue (MRR)</p>
          <h3 className="text-3xl font-bold font-en text-gray-900">$12,450</h3>
          <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +15% this month</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Active Paid Subscriptions</p>
          <h3 className="text-3xl font-bold font-en text-gray-900">845</h3>
          <p className="text-xs text-gray-500 mt-2 font-medium">Growth plan is most popular</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Total Processed Orders (All time)</p>
          <h3 className="text-3xl font-bold font-en text-gray-900">2.5M+</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">ইউজার ম্যানেজমেন্ট (Sellers)</h3>
          <input type="text" placeholder="Search by email or shop..." className="p-2 border border-gray-300 rounded outline-none focus:border-[#0F6E56] text-sm font-en w-64" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm font-en">
            <thead className="bg-white border-b border-gray-200">
              <tr className="text-gray-500">
                <th className="p-4 font-medium">Shop / User</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Plan</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Joined Date</th>
                <th className="p-4 font-medium text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Rahim Collection', email: 'rahim@example.com', plan: 'Growth', status: 'Active', date: '01 Oct 2023' },
                { name: 'Gadget BD', email: 'hello@gadgetbd.com', plan: 'Pro', status: 'Active', date: '15 Jan 2024' },
                { name: 'Sneakers Hub', email: 'info@sneakers.bd', plan: 'Starter', status: 'Past Due', date: '10 Mar 2025' },
                { name: 'Women Fashion', email: 'admin@wf.com', plan: 'Growth', status: 'Active', date: '22 Feb 2026' },
              ].map((u, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="p-4 font-medium text-gray-900">{u.name}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-700">{u.plan}</span></td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{u.date}</td>
                  <td className="p-4 text-right space-x-2">
                    <button className="text-[#0F6E56] bg-[#0F6E56]/10 px-3 py-1 rounded text-xs font-bold hover:bg-[#0F6E56]/20 transition">Manage</button>
                    <button className="text-red-600 bg-red-100 px-3 py-1 rounded text-xs font-bold hover:bg-red-200 transition">Flag</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
