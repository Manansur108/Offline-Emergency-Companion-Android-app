
import { Cpu, ShieldAlert } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

export function BottomNav() {
    const tabs = [
        { id: 'emergency', icon: ShieldAlert, label: 'SOS', path: '/' },
        { id: 'model', icon: Cpu, label: 'Model', path: '/model' },
    ];

    return (
        <div className="w-full flex justify-center pointer-events-none">
            <div className="w-full max-w-xs bg-white/90 backdrop-blur-xl border border-rose-200/70 shadow-xl rounded-[1.75rem] pointer-events-auto">
                <div className="flex items-center justify-around p-2">
                    {tabs.map((tab) => (
                        <NavLink
                            key={tab.id}
                            to={tab.path}
                            className={({ isActive }) =>
                                cn(
                                    'relative flex flex-col items-center justify-center min-w-16 h-16 rounded-2xl transition-all duration-300',
                                    isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                                    <span className="text-[10px] font-medium mt-1">{tab.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-1 w-1 h-1 bg-primary rounded-full"
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
}
