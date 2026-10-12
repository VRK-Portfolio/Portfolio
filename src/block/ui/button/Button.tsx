'use client';
import './button.css';


export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  outline?: boolean;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  rounded?: boolean;
};

const Button = ({ type = 'button', variant = 'primary', className = '', outline = false, children, size = 'medium', fullWidth = false, rounded = false, ...props }: ButtonProps) => {
  return (
    <button {...props} type={type} className={`cmp-button  ${outline ? `cmp-button__${variant}-outline` : `cmp-button__${variant}`} ${`cmp-button__${size}`} ${fullWidth ? 'cmp-button__full-width' : ''} ${rounded ? 'cmp-button__rounded' : ''} ${className}`}>
      {children}
    </button>
  );
};


export default Button;