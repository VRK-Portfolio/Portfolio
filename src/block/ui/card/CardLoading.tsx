import Card from "./Card";

const CardLoading = () => (
    <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
        <Card>
            <div className="shimmer h-48 w-full mb-4" />
            <Card.Body>
                <div className="shimmer h-6 w-3/4 mb-4" />
                <div className="flex gap-2 mb-4">
                    <div className="shimmer h-5 w-16" />
                    <div className="shimmer h-5 w-20" />
                </div>
                <div className="shimmer h-4 w-full mb-2" />
                <div className="shimmer h-4 w-full mb-2" />
                <div className="shimmer h-4 w-2/3" />
            </Card.Body>
            <Card.Footer>
                <div className="shimmer h-5 w-24" />
            </Card.Footer>
        </Card>
    </div>
);

export default CardLoading;
