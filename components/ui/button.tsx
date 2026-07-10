'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

/** Maps onto the .btn classes in globals.css so <Button> and legacy `className="btn"` call sites stay visually identical. */
const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-secondary border-transparent hover:bg-white/5',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * The one button. Renders a Next <Link> when given `href`, a native <button>
 * otherwise, so navigation and actions share identical styling and focus
 * behavior.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const classes = cn(variantClass[variant], sizeClass[size], className);

  if (props.href !== undefined) {
    const { href, ...rest } = props as ButtonAsLink;
    return <Link href={href} className={classes} {...rest} />;
  }

  const { type = 'button', ...rest } = props as ButtonAsButton;
  return <button type={type} className={classes} {...rest} />;
}
