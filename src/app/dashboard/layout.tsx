'use client';
import {useState} from 'react';
import Sidebar from '@/src/components/Sidebar';
import Header from '@/src/components/Header';
import FeedbackModal from '@/src/components/popup/FeedbackModal';

export default function DashboardLayout({
    children,
}:{
    children: React.ReactNode;
}){

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return(
        <div className='flex h-screen overflow-hidden bg-gray-100'>
            <Sidebar 
             isMobileMenuOpen={isMobileMenuOpen}
             setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
            <FeedbackModal formUrl="https://forms.cloud.microsoft/r/BMCfDEH5rn" />

            <div className='flex flex-col w-0 flex-1 overflow-hidden md:pl-64'>
                <Header setIsMobileMenuOpen={setIsMobileMenuOpen} />
                <main className="flex-1 relative overflow-y-auto focus:outline-none p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
