import { useEffect, useState } from 'react'

interface Props {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  className?: string
  decimal?: boolean
  ariaLabel?: string
}

/** 入力途中の "60." などを保持できる数値入力 */
export function NumInput({ value, onChange, placeholder, className, decimal = true, ariaLabel }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value))

  useEffect(() => {
    const parsed = text === '' ? null : Number(text)
    if (parsed !== value) setText(value == null ? '' : String(value))
    // text は意図的に依存に含めない（外部からの変更時のみ同期）
  }, [value])

  return (
    <input
      className={className}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '')
        setText(t)
        if (t === '') onChange(null)
        else if (!Number.isNaN(Number(t))) onChange(Number(t))
      }}
    />
  )
}
