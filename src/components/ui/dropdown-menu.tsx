"use client"

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '@/lib/cn';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [menuStyles, setMenuStyles] = useState<React.CSSProperties>({});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyles({
        position: 'fixed',
        top: rect.bottom + 4, // 4px gap
        left: align === 'right' ? rect.right - 224 : rect.left, // 224px = 14rem
        zIndex: 9999,
        minWidth: 224,
      });
    }
  }, [isOpen, align]);

  return (
    <div className="relative" ref={menuRef}>
      <div ref={triggerRef} onClick={() => setIsOpen((v) => !v)}>
        {trigger}
      </div>
      {isOpen && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          style={menuStyles}
          className={cn(
            "rounded-md border bg-white p-1 shadow-md",
            align === 'right' ? '' : ''
          )}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function DropdownMenuItem({ children, className, ...props }: DropdownMenuItemProps) {
  return (
    <button
      className={cn(
        "w-full whitespace-nowrap flex items-center rounded-sm px-2 py-1.5 text-sm text-left hover:bg-gray-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-gray-200" />;
}
