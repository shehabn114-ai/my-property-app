'use client';
import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Filter, Home, Users, FileText, Settings, 
  ChevronRight, Edit, Trash2, X, ChevronLeft, Building, AlertCircle, Receipt, Calendar, Clock, DoorOpen, Loader2, Menu, MessageCircle, Printer 
} from 'lucide-react';
import Link from 'next/link';

export default function PropertiesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('الكل');
  
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activePropertyForReceipt, setActivePropertyForReceipt] = useState<any>(null);
  const [receiptAmount, setReceiptAmount] = useState('');

  const [activeWhatsappMenu, setActiveWhatsappMenu] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/properties-data');
        const result = await res.json();

        if (result && result.success && Array.isArray(result.data)) {
          const formatted = result.data.map((item: Record<string, any>, index: number) => {
            const rawStatus = item['الحالة النهائية'] || 'شاغرة'; 
            const isVacant = rawStatus !== 'مؤجر';
            
            let remainingText = item['المتبقي في العقد'] || '-';
            if (remainingText !== '-' && remainingText !== 'شاغرة' && !remainingText.includes('يوم')) {
              remainingText = `${remainingText} يوم`;
            }

            return {
              id: index + 1,
              buildingName: item['المبني'] || 'غير محدد',
              name: `مبنى (${item['المبني'] || '-'}) - وحدة ${item['رقم الشقة'] || ''}`,
              contractNo: item['رقم العقد'] || '',
              phone: item['رقم التواصل'] || '',
              remainingDays: remainingText,
              price: `${item['مبلغ الايجار'] || 0} ر.س/سنوي`,
              dueAmount: `${item['المبلغ المستحق'] || '0'} ر.س`,
              realStatus: rawStatus,
              isVacant: isVacant,
              tenant: isVacant ? 'شاغرة' : (item['اسم المستأجر'] || 'شاغرة'),
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

  // حساب أعداد الوحدات لكل مبنى (باستثناء العقود التاريخية المتكررة لكي لا تتضاعف أعداد المبنى الأساسية)
  const mainPropertiesForCounts = properties.filter(p => !p.isHistoricalExpired);
  const buildingCounts = mainPropertiesForCounts.reduce((acc: any, p) => {
    acc[p.buildingName] = (acc[p.buildingName] || 0) + 1;
    return acc;
  }, {});

  // حساب أعداد الوحدات لكل حالة بناءً على المبنى المحدد حالياً
  const currentBuildingProperties = selectedBuilding 
    ? properties.filter(p => p.buildingName === selectedBuilding) 
    : properties;

  const statusCounts = {
    'الكل': currentBuildingProperties.filter(p => !p.isHistoricalExpired).length,
    'مؤجر': currentBuildingProperties.filter(p => p.realStatus === 'مؤجر' && !p.isHistoricalExpired).length,
    'شاغرة': currentBuildingProperties.filter(p => p.isVacant && !p.isHistoricalExpired).length,
    'بانتظار التصفية': currentBuildingProperties.filter(p => p.realStatus === 'بانتظار التصفية' && !p.isHistoricalExpired).length,
    'منتهي': currentBuildingProperties.filter(p => p.realStatus === 'منتهي').length, // يشمل المنتهية الرئيسية والتاريخية
  };

  const filteredProperties = properties.filter(p => {
    const matchesBuilding = selectedBuilding ? p.buildingName === selectedBuilding : true;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.tenant.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (selectedStatusFilter === 'الكل') {
      matchesStatus = !p.isHistoricalExpired;
    } else if (selectedStatusFilter === 'مؤجر') {
      matchesStatus = p.realStatus === 'مؤجر' && !p.isHistoricalExpired;
    } else if (selectedStatusFilter === 'شاغرة') {
      matchesStatus = p.isVacant && !p.isHistoricalExpired;
    } else if (selectedStatusFilter === 'بانتظار التصفية') {
      matchesStatus = p.realStatus === 'بانتظار التصفية' && !p.isHistoricalExpired;
    } else if (selectedStatusFilter === 'منتهي') {
      matchesStatus = p.realStatus === 'منتهي';
    }

    return matchesBuilding && matchesSearch && matchesStatus;
  });

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptAmount) return;
    alert(`تم إصدار سند قبض بمبلغ ${receiptAmount} بنجاح للوحدة: ${activePropertyForReceipt?.name}`);
    setIsReceiptModalOpen(false);
    setReceiptAmount('');
  };

  const handlePrintReport = () => {
    window.print();
  };

  const sendWhatsAppMessage = (phone: string, tenantName: string, unitName: string, type: 'payment' | 'expiry' | 'renewal') => {
    if (!phone) {
      alert('رقم التواصل غير متوفر لهذا المستأجر.');
      return;
    }

    let cleanPhone = phone.toString().replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '966' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('966')) {
      cleanPhone = '966' + cleanPhone;
    }

    let message = '';
    if (type === 'payment') {
      message = `السلام عليكم الأستاذ/ة ${tenantName}، نود تذكيركم بضرورة سداد المبلغ المستحق للإيجار الخاص بـ ${unitName}. شاكرين تعاونكم.`;
    } else if (type === 'expiry') {
      message = `السلام عليكم الأستاذ/ة ${tenantName}، نود إفادتكم بأن عقد الإيجار الخاص بوحدتكم (${unitName}) في منظومة شركة ROCK KEY يقترب من موعد الانتهاء.`;
    } else if (type === 'renewal') {
      message = `السلام عليكم الأستاذ/ة ${tenantName}، نود معرفة رغبتكم في تجديد عقد الإيجار للوحدة (${unitName}) للفترة القادمة. يرجى إفادتنا لاستكمال الإجراءات.`;
    }

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
    setActiveWhatsappMenu(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 relative overflow-hidden" dir="rtl">
      
      {/* تخصيص الطباعة لعرض 3 وحدات بجانب بعض */}
      <style jsx global>{`
        @media print {
          body, html {
            background-color: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
          }
          aside, nav, .print\:hidden {
            display: none !important;
          }
          .flex.h-screen {
            height: auto !important;
            overflow: visible !important;
          }
          main {
            overflow: visible !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 20px;
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .grid-printable {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 15px !important;
          }
          .printable-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
        }
        .print-header {
          display: none;
        }
      `}</style>

      {/* نافذة سند القبض */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">إضافة سند قبض جديد</h3>
                  <p className="text-xs text-gray-500">{activePropertyForReceipt?.name}</p>
                </div>
              </div>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">المستأجر</label>
                <input type="text" disabled value={activePropertyForReceipt?.tenant || '-'} className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">المبلغ المراد قبضه (ر.س)</label>
                <input type="text" placeholder="أدخل المبلغ..." value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} required className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsReceiptModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm">حفظ وإصدار السند</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-gray-300 transition-all"><Home size={18} /> لوحة التحكم</Link>
            <Link href="/properties" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium transition-all shadow-sm"><Building2 size={18} /> العقارات والوحدات</Link>
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
        
        {/* شريط المباني العلوي مع الأعداد وزر القائمة الجانبية بحجم أفضل */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-30 shadow-sm flex items-center justify-between gap-3 overflow-x-auto whitespace-nowrap print:hidden">
          <div className="flex items-center gap-3">
            {/* زر القائمة الجانبية بشكل وحجم محسّن وأنيق */}
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center shrink-0 shadow-md hover:shadow-lg active:scale-95"
              title="فتح القائمة"
            >
              <Menu size={22} />
            </button>

            <span className="text-xs font-bold text-gray-500 ml-2">المباني:</span>
            
            <button onClick={() => setSelectedBuilding(null)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${selectedBuilding === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              🏢 جميع العقارات <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${selectedBuilding === null ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-800'}`}>{mainPropertiesForCounts.length}</span>
            </button>

            {uniqueBuildings.map((bName, idx) => (
              <button key={idx} onClick={() => setSelectedBuilding(bName)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${selectedBuilding === bName ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                <Building size={14} /> مبنى {bName} 
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${selectedBuilding === bName ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  {buildingCounts[bName] || 0}
                </span>
              </button>
            ))}
          </div>

          <button 
            onClick={handlePrintReport} 
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <Printer size={16} /> طباعة النتائج والفلتر الحالي
          </button>
        </div>

        {/* شريط فلاتر الحالات مع الأعداد */}
        <div className="bg-slate-100 border-b border-gray-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs print:hidden">
          <span className="font-bold text-gray-600 ml-1">فلتر الحالة:</span>
          {[
            { key: 'الكل', label: 'الكل' },
            { key: 'مؤجر', label: 'مؤجر' },
            { key: 'شاغرة', label: 'شاغرة' },
            { key: 'بانتظار التصفية', label: 'بانتظار التصفية' },
            { key: 'منتهي', label: 'منتهي' }
          ].map((item) => {
            const count = statusCounts[item.key as keyof typeof statusCounts] || 0;
            return (
              <button
                key={item.key}
                onClick={() => setSelectedStatusFilter(item.key)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all shadow-2xs flex items-center gap-1.5 ${
                  selectedStatusFilter === item.key 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'bg-white text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{item.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedStatusFilter === item.key ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* رأس التقرير للطباعة */}
          <div className="print-header">
            <h2 className="text-xl font-bold">تقرير الوحدات والعقارات - شركة ROCK KEY (منظومة SN7)</h2>
            <p className="text-sm mt-1">
              {selectedBuilding ? `المبنى: ${selectedBuilding}` : 'جميع المباني'} | 
              {` حالة الفلتر: ${selectedStatusFilter}`} | 
              {` العدد الإجمالي للنتائج: ${filteredProperties.length} وحدة`}
            </p>
          </div>

          <div className="flex items-center justify-between print:hidden">
            <h1 className="text-2xl font-extrabold text-gray-900">سجل الوحدات والعقارات المستوردة من شيت الإكسيل</h1>
            <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
              عدد الوحدات المعروضة: {filteredProperties.length}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20 text-blue-600 gap-2">
              <Loader2 className="animate-spin" size={24} /> جاري قراءة البيانات من ملف الإكسيل...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-printable">
              {filteredProperties.length > 0 ? (
                filteredProperties.map((prop) => {
                  const isVacant = prop.isVacant;
                  const isMenuOpen = activeWhatsappMenu === prop.id;

                  const badgeText = (selectedStatusFilter === 'الكل' || selectedStatusFilter === 'شاغرة')
                    ? (isVacant ? 'شاغرة' : 'مؤجر')
                    : prop.realStatus;

                  return (
                    <div 
                      key={prop.id} 
                      className={`rounded-2xl border shadow-sm p-6 flex flex-col justify-between transition-all relative printable-card ${
                        isVacant 
                          ? 'bg-amber-50/40 border-dashed border-amber-200 hover:border-amber-300' 
                          : 'bg-white border-gray-100 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">{prop.type}</span>
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                            badgeText === 'مؤجر' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {badgeText}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{prop.name}</h3>
                          {prop.contractNo && prop.contractNo !== '-' && (
                            <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-mono font-bold shadow-2xs mr-2">
                              عقد: {prop.contractNo}
                            </span>
                          )}
                        </div>

                        <div className={`p-3 rounded-xl border text-xs space-y-2 mb-4 ${
                          isVacant ? 'bg-amber-100/50 border-amber-200/60 text-amber-900' : 'bg-gray-50 border-gray-100'
                        }`}>
                          <p className="flex justify-between items-center">
                            <span>المستأجر:</span>
                            <span className={`font-bold ${isVacant ? 'text-amber-800 italic' : 'text-gray-800'}`}>
                              {prop.tenant}
                            </span>
                          </p>
                          
                          {!isVacant && (
                            <div className="flex justify-between items-center relative">
                              <span>رقم التواصل:</span>
                              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                                {prop.phone ? `+966 ${prop.phone}` : 'غير متوفر'}
                                <button 
                                  onClick={() => setActiveWhatsappMenu(isMenuOpen ? null : prop.id)}
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs relative print:hidden"
                                  title="تواصل عبر واتساب"
                                >
                                  <MessageCircle size={14} />
                                </button>
                              </span>

                              {isMenuOpen && (
                                <div className="absolute left-0 top-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-20 w-64 text-right space-y-1 animate-in fade-in zoom-in-95 duration-150 print:hidden">
                                  <div className="text-[10px] font-extrabold text-gray-400 px-3 py-1 border-b border-gray-100">
                                    اختر قالب رسالة الواتساب:
                                  </div>
                                  <button 
                                    onClick={() => sendWhatsAppMessage(prop.phone, prop.tenant, prop.name, 'payment')}
                                    className="w-full text-right px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all"
                                  >
                                    💬 مطالبة بسداد الإيجار
                                  </button>
                                  <button 
                                    onClick={() => sendWhatsAppMessage(prop.phone, prop.tenant, prop.name, 'expiry')}
                                    className="w-full text-right px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-all"
                                  >
                                    ⏳ تنبيه اقتراب انتهاء العقد
                                  </button>
                                  <button 
                                    onClick={() => sendWhatsAppMessage(prop.phone, prop.tenant, prop.name, 'renewal')}
                                    className="w-full text-right px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                                  >
                                    📝 الاستفسار عن رغبة التجديد
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          <p className="flex justify-between">
                            <span>المتبقي في العقد:</span>
                            <span className="font-bold text-purple-600">{prop.remainingDays}</span>
                          </p>
                          <p className="flex justify-between">
                            <span>الإيجار السنوي:</span>
                            <span className="font-bold text-blue-600">{prop.price}</span>
                          </p>
                          <p className="flex justify-between">
                            <span>المبلغ المستحق:</span>
                            <span className="font-bold text-rose-600">{prop.dueAmount}</span>
                          </p>
                        </div>
                      </div>

                      {isVacant ? (
                        <div className="w-full text-center py-2 text-xs font-bold text-amber-700 bg-amber-100/80 rounded-xl border border-amber-200">
                          وحدة شاغرة (لا يوجد عقد نشط)
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setActivePropertyForReceipt(prop); setIsReceiptModalOpen(true); }} 
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm print:hidden"
                        >
                          <Receipt size={14} /> إضافة سند قبض
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-400">
                  لا توجد وحدات مطابقة للفلتر أو البحث المحدد.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}