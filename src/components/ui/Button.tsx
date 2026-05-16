import React from 'react';
import { cn } from '../../utils/cn';
import { motion, type MotionProps } from 'framer-motion';

type ButtonBaseProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

interface ButtonProps extends ButtonBaseProps {
    variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    rounded?: 'full' | 'xl' | '2xl';
    isLoading?: boolean;
}

// Combine Framer Motion props with our custom props
const Button = React.forwardRef<HTMLButtonElement, ButtonProps & MotionProps>(
    ({ className, variant = 'primary', size = 'md', rounded = 'xl', isLoading, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-primary text-white shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5',
            secondary: 'bg-secondary text-white shadow-lg hover:shadow-secondary/40 hover:-translate-y-0.5',
            accent: 'bg-accent text-white shadow-lg hover:shadow-accent/40 hover:-translate-y-0.5',
            outline: 'border-2 border-primary text-primary hover:bg-primary/10',
            ghost: 'text-slate-600 hover:bg-slate-100',
        };

        const sizes = {
            sm: 'px-4 py-2 text-sm',
            md: 'px-6 py-3 text-base',
            lg: 'px-8 py-4 text-lg font-bold',
            icon: 'p-3',
        };

        return (
            <motion.button
                ref={ref}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    'inline-flex items-center justify-center font-medium transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none',
                    variants[variant],
                    sizes[size],
                    `rounded-${rounded}`,
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : null}
                {children}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';
export { Button };
