'use client';

import BasicInfoBanner from "@/components/site/basic-info-banner/Basic-Info-Banner";
import MySkillsComponent from "@/components/site/my-skills/My-Skills";
import ProjectListingComponent from "@/components/site/project-listing/project-listing";
import RecentBlogsComponent from "@/components/site/recent-blogs/recent-blogs";

const HomePage = () => {
    return (
        <>
            <div className="home-page">
                <BasicInfoBanner className="section" />
                <MySkillsComponent className="section bg-gray" />
                <ProjectListingComponent maxCount={3} className="section" />
                <RecentBlogsComponent maxCount={3} className="section bg-gray" />
            </div>
        </>
    )
}

export default HomePage;
