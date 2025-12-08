import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
  className?: string;
}

export function Button({
  children,
  variant = "default",
  size = "default",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    default: "px-4 py-2",
  };

  const variantStyles = {
    default:
      "bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white hover:brightness-110 focus:ring-orange-500",
    outline:
      "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
    ghost:
      "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
