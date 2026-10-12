import Image from 'next/image';
import './basic-info-banner.css';
import { useEffect, useState } from 'react';
import { BasicInfoType } from "@/@types/BasicInfo.types";

const BasicInfoBanner = ({className}: {className?: string}) => {

    const [basicInfo, setBasicInfo] = useState<BasicInfoType>();
    
    useEffect(() => {
        const fetchBasicInfo = async() => {
            const response = await fetch('/api/basic-info');
            const data = await response.json();
            if(data.success) {
                setBasicInfo(data.data[0]);
            }
        }
        fetchBasicInfo();
    }, [])
    return (
        <div className={` cmp-basic-info-banner ${className ? className : ''}`}>
            <div className='container'>
                <Image
                    className="cmp-basic-info-banner__image"
                    src={basicInfo?.avatar_url || '/images/basic-info/photo.png'}
                    alt="Basic Info Banner"
                    width={200}
                    height={200}
                />
                <h1 className='cmp-basic-info-banner__title'>{basicInfo?.name}</h1>
                <h2 className='cmp-basic-info-banner__bio'>{basicInfo?.bio}</h2>
                <p className='cmp-basic-info-banner__about-me'>{basicInfo?.about_me}</p>
            </div>
        </div>
    );
};

export default BasicInfoBanner;

