'use client';
import React, { useState, useEffect } from 'react';
import { 
  Building2, Home, Users, FileText, Settings, Menu, X, Building, Receipt, Printer, Loader2, CheckCircle2, Clock, DoorOpen, PieChart 
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('الكل');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('الكل');

  const excelDateToJSDate = (serial: any) => {
    if (!serial || isNaN(serial)) return '-';
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);

    const year = date_info.getUTCFullYear();
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date_info.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/properties-data');
        const result = await res.json();

        if (result && result.success && Array.isArray(result.data)) {
          const formatted = result.data.map((item: Record<string, any>, index: number) => {
            const rawStatus = item['الحالة النهائية'] || 'شاغرة'; 
            const isVacant = item['isVacant'] !== undefined ? item['isVacant'] : (rawStatus !== 'مؤجر');
            const monthlyRentVal = Number(item['الإيجار الشهري']) || 0;

            return {
              id: index + 1,
              buildingName: item['المبني'] || 'غير محدد',
              name: `مبنى (${item['المبني'] || '-'}) - وحدة ${item['رقم الشقة'] || ''}`,
              contractNo: item['رقم العقد'] || '',
              phone: item['رقم التواصل'] || '',
              monthlyPrice: isVacant ? '0 ر.س' : (monthlyRentVal > 0 ? `${monthlyRentVal} ر.س / شهرياً` : '0 ر.س'),
              realStatus: rawStatus,
              isVacant: isVacant,
              tenant: isVacant ? 'شاغرة' : (item['اسم المستأجر'] || 'شاغرة'),
              dueDate: isVacant ? '-' : excelDateToJSDate(item['تاريخ نهاية العقد']),
              isHistoricalExpired: item['isHistoricalExpired'] || false
            };
          });
          setProperties(formatted);
        } else {
          setProperties([]);
        }
      } catch (err) {
        console.error('فشل جلب البيانات', err);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const uniqueBuildings = Array.from(new Set(properties.map(p => p.buildingName)));

  const buildingFilteredProperties = properties.filter(p => {
    const matchesBuilding = selectedBuildingFilter === 'الكل' || p.buildingName === selectedBuildingFilter;
    return matchesBuilding;
  });

  const mainProperties = buildingFilteredProperties.filter(p => !p.isHistoricalExpired);
  const totalUnits = mainProperties.length;
  const rentedUnits = mainProperties.filter(p => p.realStatus === 'مؤجر').length;
  const vacantUnits = mainProperties.filter(p => p.isVacant).length;
  const pendingUnits = mainProperties.filter(p => p.realStatus === 'بانتظار التصفية').length;
  const occupancyRate = totalUnits > 0 ? ((rentedUnits / totalUnits) * 100).toFixed(1) : 0;

  const filteredTableData = buildingFilteredProperties.filter(p => {
    let matchesTab = true;
    if (activeTab === 'الكل') {
      matchesTab = !p.isHistoricalExpired && p.realStatus !== 'بانتظار التصفية' && p.realStatus !== 'منتهي';
    } else if (activeTab === 'مؤجر') {
      matchesTab = p.realStatus === 'مؤجر' && !p.isHistoricalExpired;
    } else if (activeTab === 'متاح') {
      matchesTab = p.isVacant && !p.isHistoricalExpired;
    } else if (activeTab === 'بانتظار التصفية') {
      matchesTab = p.realStatus === 'بانتظار التصفية' && !p.isHistoricalExpired;
    } else if (activeTab === 'منتهي') {
      matchesTab = p.realStatus === 'منتهي';
    }

    return matchesTab;
  });

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 relative overflow-hidden" dir="rtl">
      
      {/* القائمة الجانبية */}
      <aside className={`fixed md:static top-0 right-0 h-full w-64 bg-slate-900 text-white p-6 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-white text-lg shadow-lg">SN7</div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">منظومة SN7</h2>
                <span className="text-xs text-gray-400">شركة ROCK KEY</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-2">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium transition-all shadow-sm"><Home size={18} /> لوحة التحكم</Link>
            <Link href="/properties" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-gray-300 transition-all"><Building2 size={18} /> العقارات والوحدات</Link>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-gray-300 transition-all"><Users size={18} /> المستأجرون</a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-gray-300 transition-all"><FileText size={18} /> العقود والمالية</a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-gray-300 transition-all"><Settings size={18} /> الإعدادات</a>
          </nav>
        </div>
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 text-xs text-gray-400">
          <p className="font-semibold text-gray-200 mb-1">شركة ROCK KEY</p>
          <p>نظام SN7 الموحد © 2026</p>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* الشريط العُلوي */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center shrink-0 shadow-md md:hidden"
              title="فتح القائمة"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">لوحة تحكم الأملاك - ROCK KEY</h1>
              <p className="text-xs text-gray-500">متابعة الوحدات والعقود الخاصة بشركة ROCK KEY عبر منظومة SN7.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-gray-700">النظام نشط</span>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          
          {/* بطاقات الإحصائيات ونسبة الإشغال */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1">إجمالي العقارات</p>
                <h3 className="text-2xl font-extrabold text-gray-900">{totalUnits} وحدات</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Building2 size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1">الوحدات المؤجرة</p>
                <h3 className="text-2xl font-extrabold text-emerald-600">{rentedUnits} وحدات</h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1">الوحدات الشاغرة</p>
                <h3 className="text-2xl font-extrabold text-amber-600">{vacantUnits} وحدات</h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <DoorOpen size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1">بانتظار التصفية</p>
                <h3 className="text-2xl font-extrabold text-purple-600">{pendingUnits} وحدات</h3>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-1">نسبة الإشغال</p>
                <h3 className="text-2xl font-extrabold text-blue-600">{occupancyRate}%</h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <PieChart size={24} />
              </div>
            </div>
          </div>

          {/* قسم الجدول */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">سجل الوحدات والأصول لشركة: ROCK KEY</h2>
                <p className="text-xs text-gray-500 mt-0.5">عرض تفصيلي لحالة الوحدات والمستأجرين والإيجار الشهري.</p>
              </div>

              {/* أداة اختيار المبنى */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">فلتر المبنى:</span>
                <select 
                  value={selectedBuildingFilter} 
                  onChange={(e) => setSelectedBuildingFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="الكل">جميع المباني (الكل)</option>
                  {uniqueBuildings.map((bName: any, idx: number) => (
                    <option key={idx} value={bName}>مبنى {bName}</option>
                  ))}
                </select>
              </div>

              {/* فلاتر الحالات السريعة */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                {['الكل', 'مؤجر', 'متاح', 'بانتظار التصفية', 'منتهي'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === tab ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20 text-blue-600 gap-2">
                <Loader2 className="animate-spin" size={24} /> جاري تحميل البيانات...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50/75 text-gray-400 font-bold border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-6">اسم العقار / الوحدة</th>
                      <th className="py-3 px-6">النوع</th>
                      <th className="py-3 px-6">المستأجر الحالي</th>
                      <th className="py-3 px-6">الإيجار الشهري</th>
                      <th className="py-3 px-6">تاريخ نهاية العقد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredTableData.length > 0 ? (
                      filteredTableData.map((item, index) => (
                        <tr 
                          key={index} 
                          className={`transition-colors ${item.isVacant ? 'bg-amber-50/70 hover:bg-amber-100/60' : 'hover:bg-gray-50/50'}`}
                        >
                          <td className="py-4 px-6 font-bold text-gray-900">{item.name}</td>
                          <td className="py-4 px-6 text-gray-500">وحدة عقارية</td>
                          <td className="py-4 px-6 font-medium">
                            {item.isVacant ? (
                              <span className="px-3 py-1 rounded-lg bg-amber-200/80 text-amber-900 font-bold">شاغرة</span>
                            ) : (
                              <span className="text-gray-800">{item.tenant}</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-bold text-blue-600">{item.monthlyPrice}</td>
                          <td className="py-4 px-6 font-mono font-bold text-gray-600">{item.dueDate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400">
                          لا توجد بيانات مطابقة للعرض حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}