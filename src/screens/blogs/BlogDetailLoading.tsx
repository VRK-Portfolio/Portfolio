import CardLoading from "@/block/ui/card/CardLoading";

const BlogDetailLoading = () => (
    <div role="status" aria-label="Loading blog detail" aria-busy="true" className="cmp-blog-detail">
        <div className="container">
            <div aria-hidden="true" className="col-span-12 lg:col-span-8 animate-pulse motion-reduce:animate-none">
                <div className="cmp-blog-detail__cover-image shimmer mb-4" />
                <div className="shimmer h-10 w-3/4 mb-4" />
                <div className="shimmer h-4 w-48 mb-4" />
                <div className="flex gap-2 mb-6">
                    <div className="shimmer h-6 w-20" />
                    <div className="shimmer h-6 w-24" />
                </div>
                {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className={`shimmer h-4 mb-3 ${index % 4 === 3 ? 'w-2/3' : 'w-full'}`} />
                ))}
            </div>
            <div aria-hidden="true" className="col-span-12 lg:col-span-4 flex flex-col gap-3">
                <div className="shimmer h-6 w-36 animate-pulse motion-reduce:animate-none" />
                {Array.from({ length: 3 }, (_, index) => <CardLoading key={index} />)}
            </div>
        </div>
    </div>
);

export default BlogDetailLoading;
