/*
 * Componente Badge per visualizzare lo stato CRM dei lead
 * 
 * Mostra lo stato attuale del lead nel processo di vendita con colori
 * e icone appropriate. Include anche indicatori per follow-up in ritardo.
 * Visibile solo per utenti PRO nella dashboard lead.
 * 
 * Usato da: dashboard admin, componenti lead card
 */

import React from 'react';
import Badge from '@/components/ui/Badge';
import { CRMStatusType, CRM_STATUS_CONFIG } from '@/lib/types/crm';

// Utility per combinare classi CSS
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface LeadStatusBadgeProps {
  status?: CRMStatusType;
  nextFollowUp?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function LeadStatusBadge({ 
  status = 'new', 
  nextFollowUp,
  className = '',
  size = 'sm'
}: LeadStatusBadgeProps) {
  const config = CRM_STATUS_CONFIG[status];
  
  // Verifica se il follow-up è in ritardo
  const isOverdue = nextFollowUp && new Date(nextFollowUp) < new Date();
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  return (
    <div className="flex items-center gap-1.5">
      <Badge 
        variant="default"
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
        className={cn(
          config.color,
          'font-medium border-0 inline-flex items-center gap-1',
          className
        )}
      >
        <span className="text-xs" role="img" aria-label={config.label}>
          {config.icon}
        </span>
        {config.label}
      </Badge>
      
      {/* Badge follow-up in ritardo */}
      {isOverdue && (
        <Badge 
          variant="error"
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
          className="animate-pulse font-medium inline-flex items-center gap-1"
        >
          <span className="text-xs" role="img" aria-label="Attenzione">
            ⚠️
          </span>
          Follow-up in ritardo!
        </Badge>
      )}
    </div>
  );
}

// Componente per selezione stato (per form)
interface StatusSelectorProps {
  currentStatus: CRMStatusType;
  onChange: (status: CRMStatusType) => void;
  disabled?: boolean;
}

export function StatusSelector({ 
  currentStatus, 
  onChange, 
  disabled = false 
}: StatusSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(CRM_STATUS_CONFIG).map(([key, config]) => {
        const statusKey = key as CRMStatusType;
        const isSelected = currentStatus === statusKey;
        
        return (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && onChange(statusKey)}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
              'border border-gray-200 hover:border-gray-300',
              isSelected 
                ? config.color + ' border-transparent shadow-sm' 
                : 'bg-white text-gray-700 hover:bg-gray-50',
              disabled && 'opacity-50 cursor-not-allowed hover:border-gray-200 hover:bg-white'
            )}
          >
            <span className="text-xs" role="img" aria-label={config.label}>
              {config.icon}
            </span>
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
