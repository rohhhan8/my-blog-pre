import React from 'react';

const Input = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`appearance-none block w-full px-3 py-2 border ${
          error ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'
        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blog-accent focus:border-blog-accent dark:bg-gray-700 dark:text-white transition-colors duration-200 ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default Input;

