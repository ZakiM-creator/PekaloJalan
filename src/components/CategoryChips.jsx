import React from 'react';
import { 
  Compass, Coffee, UtensilsCrossed, Hotel, Ticket, ShoppingBag, Landmark, Flame, Grid 
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
  Flame
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
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Semua Kategori</span>
        </button>

        {/* 8 Categories */}
        {categories.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon] || Compass;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
