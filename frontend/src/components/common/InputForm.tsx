import React, { useState } from 'react';

interface InputFormProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, placeholder }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value);
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="input-field"
      />
      <button type="submit" className="btn-primary">
        Submit
      </button>
    </form>
  );
};

export default InputForm; 