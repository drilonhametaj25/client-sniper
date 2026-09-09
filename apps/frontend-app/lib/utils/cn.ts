/**
 * cn — concatenazione condizionale di classi CSS.
 *
 * Percorso: apps/frontend-app/lib/utils/cn.ts
 * Usato da: tutte le primitive in components/ui/ e dalle schermate.
 *
 * Nota: non fa merge "intelligente" delle classi Tailwind in conflitto.
 * Le primitive mettono sempre `className` in ULTIMA posizione, cosi' chi
 * usa il componente puo' sovrascrivere una classe passandola da fuori.
 */

import clsx, { type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export default cn
