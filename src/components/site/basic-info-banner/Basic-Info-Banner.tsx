import Image from 'next/image';
import './basic-info-banner.css';
import '@/block/ui/button/button.css';
import { useBasicInfo } from '@/hooks/useBasicInfo';
import BasicInfoLoading from './BasicInfoLoading';
import StructuredData from '@/components/site/structured-data/StructuredData';
import { profileStructuredData } from '@/libs/structured-data';

const BasicInfoBanner = ({className}: {className?: string}) => {

    const { basicInfo, isBasicInfoLoading } = useBasicInfo();
    
    if(isBasicInfoLoading) {
        return <BasicInfoLoading />;
    }

    return (
        <div className={` cmp-basic-info-banner ${className ? className : ''}`}>
            {basicInfo && <StructuredData data={profileStructuredData(basicInfo)} />}
            <div className='container'>
                <Image
                    className="cmp-basic-info-banner__image"
                    src={basicInfo?.avatar_url || '/images/basic-info/photo.png'}
                    alt={basicInfo ? `${basicInfo.name}, frontend engineer` : "Portfolio portrait"}
                    width={200}
                    height={200}
                    loading="eager"
                    fetchPriority="high"
                />
                {basicInfo && <h1 className='cmp-basic-info-banner__title'>{basicInfo.name}</h1>}
                <p className='cmp-basic-info-banner__bio'>{basicInfo?.bio}</p>
                <p className='cmp-basic-info-banner__about-me'>{basicInfo?.about_me}</p>
                {basicInfo && (
                    <nav className="cmp-basic-info-banner__social-links" aria-label="Social profiles">
                        <a
                            href={basicInfo.github_url}
                            className="cmp-button cmp-button__ghost cmp-button__rounded cmp-basic-info-banner__social-link"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub profile (opens in a new tab)"
                            title="GitHub"
                        >
                            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                                <path d="M9 19c-4.3 1.3-4.3-2.5-6-3m12 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 18.91 1S17.73.65 15 2.48a13.38 13.38 0 0 0-6 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                            </svg>
                        </a>
                        <a
                            href={basicInfo.linked_in_url}
                            className="cmp-button cmp-button__ghost cmp-button__rounded cmp-basic-info-banner__social-link"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn profile (opens in a new tab)"
                            title="LinkedIn"
                        >
                            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V8h4v2" />
                                <rect x="2" y="8" width="4" height="13" />
                                <circle cx="4" cy="4" r="2" />
                            </svg>
                        </a>
                    </nav>
                )}
            </div>
        </div>
    );
};

export default BasicInfoBanner;

