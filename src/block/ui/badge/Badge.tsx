'use client';
import { X } from 'lucide-react';
import './badge.css';

export interface BaseBadgeProps {
    children: React.ReactNode;
    className?: string;
    
}

export interface CloseableBadgeProps extends BaseBadgeProps {
    close: true;
    onClose: () => void;
}

export interface NonCloseableBadgeProps extends BaseBadgeProps {
    close?: false;
    onClose?: never;
}

export type BadgeProps = CloseableBadgeProps | NonCloseableBadgeProps;
const Badge = ({ children, close = false, onClose, className = '' }: BadgeProps) => {
    return (
        <span className={`cmp-badge ${className ? className : ""}`}>
            {children}
            {close && (
                <button className="cmp-badge__close" onClick={onClose}>
                    <X className="size-4" />
                    <span className="sr-only">Close</span>
                </button>
            )}
        </span>
    );
}

export default Badge;