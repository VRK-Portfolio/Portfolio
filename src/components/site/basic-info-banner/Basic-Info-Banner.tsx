import Image from 'next/image';
import './basic-info-banner.css';
import { useBasicInfo } from '@/hooks/useBasicInfo';
import BasicInfoLoading from './BasicInfoLoading';
import StructuredData from '@/components/site/structured-data/StructuredData';
import { profileStructuredData } from '@/libs/structured-data';
import ShareLinks from '@/components/site/share-links/ShareLinks';
import { SITE_ORIGIN } from '@/libs/site-url';

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
                {basicInfo && <h1 className='cmp-basic-info-banner__title'>{basicInfo.name} - Mastra AI &amp; EDS Frontend Engineer</h1>}
                <p className='cmp-basic-info-banner__bio'>{basicInfo?.bio}</p>
                <p className='cmp-basic-info-banner__about-me'>{basicInfo?.about_me}</p>
                {basicInfo && <ShareLinks title={`${basicInfo.name} | Mastra AI & EDS Frontend Engineer`} url={SITE_ORIGIN} />}
            </div>
        </div>
    );
};

export default BasicInfoBanner;

