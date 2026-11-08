// Figma Badge: Tone=Strong | Normal | Demo | Success | Coral | Danger | Brand
const TONE = {
  strong: 'bg-brand text-white',
  normal: 'bg-subtle text-ink-2',
  demo: 'bg-warning-tint text-warning-ink',
  success: 'bg-success-tint text-success-ink',
  coral: 'bg-coral-tint text-coral-ink',
  danger: 'bg-danger-tint text-danger-ink',
  brand: 'bg-brand-tint text-brand',
}

export default function Badge({ tone = 'normal', className = '', children }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-[3px] text-micro ${TONE[tone]} ${className}`}>
      {children}
    </span>
  )
}
