import React from 'react';
import { Input } from './Input';

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  style?: React.CSSProperties;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, error, style }) => {
  return (
    <Input
      type="date"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      style={style}
    />
  );
};
