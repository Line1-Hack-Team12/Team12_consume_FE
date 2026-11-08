// Figma Button: Type=Primary | Secondary | Tonal | Disabled
const VARIANT = {
  primary: 'bg-brand text-white active:bg-brand-press',
  secondary: 'bg-surface text-ink border border-line-strong active:bg-subtle',
  tonal: 'bg-brand-tint text-brand active:brightness-95',
}

const SIZE = {
  lg: 'h-[54px] px-5 text-body-b rounded-[14px]',
  md: 'h-11 px-4 text-body-b rounded-xl',
  sm: 'h-[38px] px-3 text-caption-m rounded-[10px]',
}

export default function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = true,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const look = disabled ? 'bg-subtle text-ink-3 cursor-not-allowed' : VARIANT[variant]
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${SIZE[size]} ${look} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
