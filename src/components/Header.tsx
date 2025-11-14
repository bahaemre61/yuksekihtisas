'use clinet';
import { Bars3Icon } from "@heroicons/react/24/outline";
export default function Header({ setIsMobileMenuOpen }: { setIsMobileMenuOpen: (isOpen: boolean) => void }) {    
    return(
        <div className="sticky top-0 z-10 shrink-0 flex h-16 bg-white shadow-md">
           <button
           type="button"
           className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none md:hidden"
           onClick={()=> setIsMobileMenuOpen(true)}
           >
            <Bars3Icon className="h-6 w-6"/>
           </button>
            <div className="flex-1 px-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">Kontrol Paneli</h1>        
        </div>
        </div>
    )
}