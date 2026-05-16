import React from 'react';
import { cn } from '../../utils/cn';
import { motion, type MotionProps } from 'framer-motion';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

interface CardProps extends DivProps {
    glass?: boolean;
    hoverEffect?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps & MotionProps>(
    ({ className, glass = true, hoverEffect = false, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={hoverEffect ? { opacity: 0, y: 20 } : undefined}
                animate={hoverEffect ? { opacity: 1, y: 0 } : undefined}
                whileHover={hoverEffect ? { y: -5 } : undefined}
                className={cn(
                    'rounded-3xl p-6 relative overflow-hidden',
                    glass ? 'glass-card' : 'bg-white shadow-md',
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

Card.displayName = 'Card';
export { Card };
