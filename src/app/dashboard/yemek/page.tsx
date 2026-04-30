'use client';

import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';

interface IMenu {
    _id : string;
    date : string;
    items : string[];
    calories? : number;
}

const DAYS = ['Pzt', 'Salı' , 'Çarş', 'Perş', 'Cuma', 'Cmts', 'Pazr' ];
const MONTHS = ['Ocak' , 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos','Eylül','Ekim','Kasım','Aralık'];

export default function MenuPage(){
    const [currentDate, setCurrentDate] = useState(new Date());
    const [menus, setMenus] = useState<IMenu[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [editItems, setEditItems] = useState(''); 
    const [editCalories, setEditCalories] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try{
            const userRes = await axios.get('/api/me');
            if(userRes.data.role === 'admin') setIsAdmin(true);

            const res = await axios.get(`/api/menu`,{
                params:{
                    month: currentDate.getMonth(),
                    year : currentDate.getFullYear()
                }
            });
            setMenus(res.data);
        }catch (err){
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() =>{
        fetchData();
    }, [currentDate]);

    const getDaysInMonth = (date : Date) =>{
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1,0).getDate();

        let firstDay = new Date(year,month,1).getDay();
        if(firstDay === 0) firstDay = 7;

        return {daysInMonth, firstDay}
    };

    const {daysInMonth, firstDay} = getDaysInMonth(currentDate);


    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+ offset)));
    };

    const handleDayClick = (day : number) => {
        if(!isAdmin) return;

        const clickDate = new Date(currentDate.getFullYear(), currentDate.getMonth(),day);

        clickDate.setHours(12, 0, 0, 0);

        const existingMenu = menus.find(m => new Date(m.date).getDate() === day);

        setSelectedDate(clickDate);
        setEditItems(existingMenu ? existingMenu.items.join('\n') : '');
        setEditCalories(existingMenu?.calories?.toString() || '');
        setIsModalOpen(true);
    };

    const handleSaveMenu = async () => {
    if (!selectedDate) return;
    
    
    const rawText = String(editItems || "");

    const itemsArray = rawText
        .split('\n')              
        .map(line => line.trim()) 
        .filter(line => line.length > 0); 

    
    console.log("Kaydedilecek Liste:", itemsArray);

    if (itemsArray.length === 0) {
        alert("Lütfen en az bir yemek giriniz.");
        return;
    }
    // -----------------------

    try {
        await axios.post('/api/menu', {
            date: selectedDate,
            items: itemsArray, 
            calories: editCalories
        });
        setIsModalOpen(false);
        fetchData(); 
    } catch (err) {
        console.error(err);
        alert('Kaydedilemedi.');
    }
  };
  return (
    <div className="p-4 md:p-6">
      {/* Üst Bar: Ay Seçimi */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-base-content">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex space-x-2">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200">
                <ChevronLeftIcon className="h-6 w-6 text-base-content/70"/>
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200">
                <ChevronRightIcon className="h-6 w-6 text-base-content/70"/>
            </button>
        </div>
      </div>

      {/* Takvim Grid */}
      <div className="bg-base-100 rounded-lg shadow overflow-hidden border border-base-200">
        {/* Gün Başlıkları */}
        <div className="grid grid-cols-7 bg-base-200 border-b border-base-200 text-center">
            {DAYS.map(day => (
                <div key={day} className="py-3 text-sm font-semibold text-base-content/80 uppercase tracking-wider">
                    {day}
                </div>
            ))}
        </div>

        {/* Günler */}
        <div className="grid grid-cols-7 auto-rows-fr bg-base-100">
            {/* Boş kutular (Ayın başına kadar) */}
            {Array.from({ length: firstDay - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[120px] border-b border-r border-base-200 bg-base-200/50"></div>
            ))}

            {/* Gerçek Günler */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const menuForDay = menus.find(m => new Date(m.date).getDate() === day);
                const isToday = 
                    day === new Date().getDate() && 
                    currentDate.getMonth() === new Date().getMonth() &&
                    currentDate.getFullYear() === new Date().getFullYear();

                return (
                    <div 
                        key={day} 
                        onClick={() => handleDayClick(day)}
                        className={`
                            min-h-[140px] p-2 border-b border-r border-base-200 relative transition-colors
                            ${isAdmin ? 'cursor-pointer hover:bg-primary/10' : ''}
                            ${isToday ? 'bg-primary/10/50' : ''}
                        `}
                    >
                        {/* Gün Numarası */}
                        <span className={`
                            inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                            ${isToday ? 'bg-primary text-primary-content' : 'text-base-content/80'}
                        `}>
                            {day}
                        </span>

                        {/* Yemek Listesi */}
                        <div className="mt-2 space-y-1">
                            {menuForDay ? (
                                <>
                                    {menuForDay.items.map((item, idx) => (
                                        // Sadece item doluysa göster
                                        item && item.trim() !== "" ? (
                                            <p key={idx} className="text-xs text-base-content/70 truncate font-medium">
                                                • {item}
                                            </p>
                                        ) : null
                                    ))}
                                    {menuForDay.calories && (
                                        <p className="text-[10px] text-green-600 mt-1 font-bold text-right">
                                            {menuForDay.calories} kcal
                                        </p>
                                    )}
                                </>
                            ) : (
                                isAdmin && (
                                    <div className="flex justify-center mt-4 opacity-0 group-hover:opacity-100">
                                        <PlusIcon className="h-6 w-6 text-gray-300" />
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* --- ADMIN MODAL (Menü Ekleme) --- */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-base-100 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-base-content">
                    Menü Düzenle: {selectedDate?.toLocaleDateString('tr-TR')}
                  </Dialog.Title>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-base-content/80">Yemekler (Her satıra bir tane)</label>
                    <textarea
                        rows={5}
                        className="mt-1 block w-full rounded-md border-base-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        placeholder="Mercimek Çorbası&#10;Kuru Fasulye&#10;Pilav"
                        value={editItems}
                        onChange={(e) => setEditItems(e.target.value)}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-base-content/80">Kalori (Opsiyonel)</label>
                    <input
                        type="number"
                        className="mt-1 block w-full rounded-md border-base-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        value={editCalories}
                        onChange={(e) => setEditCalories(e.target.value)}
                    />
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-base-200 px-4 py-2 text-sm font-medium text-base-content hover:bg-gray-200 focus:outline-none"
                      onClick={() => setIsModalOpen(false)}
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-content hover:brightness-90 focus:outline-none"
                      onClick={handleSaveMenu}
                    >
                      Kaydet
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
    
}
