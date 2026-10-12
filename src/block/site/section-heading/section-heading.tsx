'use client';

import './section-heading.css';

interface SectionHeadingProps {
    title: string;
    Tag?: React.ElementType;
    subtitle?: string;
}

const SectionHeading = ({ title, subtitle, Tag = 'h2' }: SectionHeadingProps) => {
    return (
        <div className="cmp-section-heading">
            <Tag className="cmp-section-heading__title">{title}</Tag>
            {subtitle && (
                <p className="cmp-section-heading__subtitle">{subtitle}</p>
            )}
        </div>
    );
};

export default SectionHeading;