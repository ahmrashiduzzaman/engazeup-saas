import React, { useState } from 'react';

export default function RoiCalculator() {
  const [orders, setOrders] = useState(1000);
  const [returnRate, setReturnRate] = useState(25);
  const [returnCost, setReturnCost] = useState(120);
  const [profitMargin, setProfitMargin] = useState(400);

  // Calculations
  const currentReturns = Math.round((orders * returnRate) / 100);
  const currentReturnWaste = currentReturns * returnCost;

  // Assuming EngazeUp AI reduces return rate by a flat 35%
  const improvedReturnRate = returnRate * 0.65;
  const improvedReturns = Math.round((orders * improvedReturnRate) / 100);
  const improvedReturnWaste = improvedReturns * returnCost;

  // Monthly Savings (just counting the delivery fee saved and extra profit gained)
  const savedPackages = currentReturns - improvedReturns;
  const monthlySavings = savedPackages * returnCost;
  const extraProfit = savedPackages * profitMargin;
  const totalFinancialImpact = monthlySavings + extraProfit;

  // Formatting utility
  const formatBd = (num: number) => num.toLocaleString('en-IN');

  return (
    <section className="py-20 bg-[#F8F9FA]" id="roi-calculator">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">আপনার ব্যবসা কতটা লস করছে?</h2>
          <p className="text-gray-600 text-lg">নিচের ক্যালকুলেটরে আপনার ব্যবসার বর্তমান অবস্থা মিলিয়ে দেখুন।</p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Controls Side */}
          <div className="p-8 lg:w-3/5 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col gap-8">
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-bold text-gray-700">মাসে মোট অর্ডার (পিস)</label>
                <span className="font-extrabold text-[#0F6E56] bg-[#0F6E56]/10 px-3 py-1 rounded-lg text-sm">{formatBd(orders)}</span>
              </div>
              <input 
                type="range" min="100" max="10000" step="50" 
                value={orders} onChange={(e) => setOrders(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0F6E56]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="font-bold text-gray-700">বর্তমান রিটার্ন রেট (%)</label>
                <span className="font-extrabold text-[#0F6E56] bg-[#0F6E56]/10 px-3 py-1 rounded-lg text-sm">{returnRate}%</span>
              </div>
              <input 
                type="range" min="5" max="50" step="1" 
                value={returnRate} onChange={(e) => setReturnRate(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0F6E56]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="font-bold text-gray-700">প্রতি রিটার্নে লস (ডেলিভারি চার্জ)</label>
                <span className="font-extrabold text-[#0F6E56] bg-[#0F6E56]/10 px-3 py-1 rounded-lg text-sm">৳{formatBd(returnCost)}</span>
              </div>
              <input 
                type="range" min="50" max="250" step="10" 
                value={returnCost} onChange={(e) => setReturnCost(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0F6E56]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="font-bold text-gray-700">প্রতি সফল অর্ডারে গড় লাভ</label>
                <span className="font-extrabold text-[#0F6E56] bg-[#0F6E56]/10 px-3 py-1 rounded-lg text-sm">৳{formatBd(profitMargin)}</span>
              </div>
              <input 
                type="range" min="50" max="2000" step="50" 
                value={profitMargin} onChange={(e) => setProfitMargin(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0F6E56]"
              />
            </div>
            
          </div>

          {/* Result Side */}
          <div className="bg-gradient-to-b from-[#0F6E56] to-[#0a4d3c] p-8 lg:w-2/5 flex flex-col justify-center text-center relative overflow-hidden">
            {/* Absolute decorative accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>

            <h3 className="text-white/80 font-bold mb-2 uppercase tracking-wide text-sm z-10">প্রতি মাসে আপনার সম্ভাব্য লাভ</h3>
            <div className="text-white font-extrabold text-5xl md:text-6xl mb-6 z-10 flex items-baseline justify-center gap-1">
              <span className="text-2xl opacity-80">৳</span>
              {formatBd(totalFinancialImpact)}
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 text-left mb-6 z-10 space-y-3">
              <div className="flex justify-between items-center text-white/90">
                <span className="text-sm font-medium">রিটার্ন চার্জ বাঁচবে:</span>
                <span className="font-bold text-white">৳{formatBd(monthlySavings)}</span>
              </div>
              <div className="flex justify-between items-center text-white/90">
                <span className="text-sm font-medium">অতিরিক্ত সেলস প্রফিট:</span>
                <span className="font-bold text-white">৳{formatBd(extraProfit)}</span>
              </div>
            </div>

            <p className="text-white/80 text-sm font-medium z-10">
              EngazeUp AI এর স্মার্ট কাস্টমার ফিল্টারিং আপনার বর্তমান রিটার্ন রেট প্রায় <span className="font-bold text-[#1D9E75] bg-white/90 px-1.5 py-0.5 rounded ml-1">৩৫% কমিয়ে</span> এই টাকা সেভ করতে পারে!
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
