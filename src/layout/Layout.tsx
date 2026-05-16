import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';

export function Layout() {
    const location = useLocation();
    const isEmergencyRoute = location.pathname === '/' || location.pathname === '/emergency';

    return (
        <div className="h-dvh overflow-hidden flex md:justify-center md:items-center md:p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="w-full h-full md:h-[88vh] md:max-w-md bg-white/60 backdrop-blur-md md:rounded-[2rem] shadow-2xl relative md:border border-white/70 overflow-hidden flex flex-col dark:bg-slate-950/80 dark:border-white/10">
                <main className={`min-h-0 flex-1 overflow-y-auto p-5 pt-10 scroll-smooth no-scrollbar ${isEmergencyRoute ? 'pb-8' : 'pb-32'}`}>
                    <Outlet />
                </main>
                {!isEmergencyRoute ? (
                    <div className="absolute bottom-5 left-0 right-0 px-5 z-40">
                        <BottomNav />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
