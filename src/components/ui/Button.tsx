import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const cls = (variant: Variant, size: Size, extra?: string) =>
  [styles.button, styles[variant], styles[size], extra].filter(Boolean).join(' ');

export function Button({ variant = 'subtle', size = 'md', icon, children, className, ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cls(variant, size, className)} {...rest}>
      {icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function LinkButton({ href, variant = 'subtle', size = 'md', icon, children, className }: Common & { href: string }) {
  return (
    <Link href={href} className={cls(variant, size, className)}>
      {children && <span>{children}</span>}
      {icon}
    </Link>
  );
}
