// @ts-nocheck
// ui/Input.tsx — Input professionnel réutilisable
import React from 'react';

const DEFAULT_BORDER_COLOR = 'var(--border2)';
const ERROR_BORDER_COLOR = 'var(--red)';
const SUCCESS_BORDER_COLOR = 'var(--green)';
const FOCUS_BORDER_COLOR = 'var(--accent)';

export const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  success,
  disabled = false,
  required = false,
  icon = null,
  iconRight = null,
  helpText,
  style = {},
  className,
  ...props
}) => {
  const resolvedBorderColor = error ? ERROR_BORDER_COLOR : success ? SUCCESS_BORDER_COLOR : DEFAULT_BORDER_COLOR;
  const focusShadow = error
    ? '0 0 0 3px var(--red-dim)'
    : success
    ? '0 0 0 3px var(--green-dim)'
    : '0 0 0 3px var(--accent-dim)';

  const handleFocus = (e) => {
    e.target.style.borderColor = FOCUS_BORDER_COLOR;
    e.target.style.boxShadow = focusShadow;
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = resolvedBorderColor;
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ marginBottom: label || helpText ? 14 : 0 }}>
      {label && (
        <label style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text2)',
          display: 'block',
          marginBottom: 6,
        }}>
          {label}
          {required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            display: 'flex',
            pointerEvents: 'none',
          }}>
            {icon}
          </div>
        )}
        <input
          className={className}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: `10px 14px${icon ? ' 14px 38px' : ''}${iconRight ? ' 38px 14px' : ''}`,
            background: disabled ? 'var(--bg2)' : 'var(--card)',
            border: `1px solid ${resolvedBorderColor}`,
            borderRadius: 8,
            color: 'var(--text)',
            fontSize: 14,
            fontFamily: 'var(--font)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {iconRight && (
          <div style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            display: 'flex',
          }}>
            {iconRight}
          </div>
        )}
      </div>
      {helpText && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{helpText}</div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
};

export const Select = ({
  label,
  value,
  onChange,
  options = [],
  error,
  disabled = false,
  required = false,
  placeholder = '...',
  style = {},
  className,
  ...props
}) => {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text2)',
          display: 'block', marginBottom: 6,
        }}>
          {label}
          {required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <select
        className={className}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: disabled ? 'var(--bg2)' : 'var(--card)',
          border: `1px solid ${error ? 'var(--red)' : 'var(--border2)'}`,
          borderRadius: 8,
          color: 'var(--text)',
          fontSize: 14,
          fontFamily: 'var(--font)',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238891a5' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
};

export default Input;
