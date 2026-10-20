import React from 'react';
import { 
  Compass, Coffee, UtensilsCrossed, Hotel, Ticket, ShoppingBag, Landmark, Flame, Grid, Briefcase 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const ICON_MAP = {
  Compass,
  Coffee,
  UtensilsCrossed,
  Hotel,
  Ticket,
  ShoppingBag,
  Landmark,
  Flame,
  Briefcase
};

export const CategoryChips = () => {
  const { categories, selectedCategory, setSelectedCategory } = useApp();

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-center gap-2 min-w-max pb-1">
        
        {/* All Category Pill */}
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Semua Kategori</span>
        </button>

        {/* Semua kategori */}
        {categories.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon] || Compass;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-800'}`} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
