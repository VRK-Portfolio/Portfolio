'use client';

import Image from 'next/image';
import './card.css';

export interface CardProps {
    className?: string;
    children?: React.ReactNode;
    Tag?: Extract<React.ElementType, 'div' | 'article'>;
}

export interface CardHeadingProps {
    className?: string;
    children: React.ReactNode;
    Tag?: Extract<React.ElementType, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>;
}

export interface CardBodyProps {
    className?: string;
    children: React.ReactNode;
}

export interface CardFooterProps {
    className?: string;
    children: React.ReactNode;
}


const CardHeading = ({className = '', children, Tag = 'h1'}: CardHeadingProps) => {
    return (
        <>
        <Tag className={`cmp-card-heading ${className}`}>
            {children}
        </Tag>
        </>
    )
}

const CardBody = ({className = '', children}: CardBodyProps) => {
    return (
        <>
            <div className={`cmp-card-body ${className}`}>
                {children}
            </div>
        </>
    )
}

const CardFooter = ({className = '', children}: CardFooterProps) => {
    return (
        <>
            <div className={`cmp-card-footer ${className}`}>
                {children}
            </div>
        </>
    )
}

const CardImage = ({className = '', imageUrl=''}: {className?: string; imageUrl: string; children?: React.ReactNode}) => {
    return (
        <div className={`cmp-card-with-image ${className}`}>
            <Image src={imageUrl} alt="Card Image" sizes="100%" fill />
        </div>
    )
}

const Card = ({className = '', children, Tag = 'div'}: CardProps) => {
    return (
        <>
            <Tag className={`cmp-card ${className}`}>
                {children}
            </Tag>
        </>
    )
}

Card.Heading = CardHeading;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Image = CardImage;

export default Card;
