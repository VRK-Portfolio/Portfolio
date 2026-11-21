const ShareLinks = ({ title, url }: { title: string; url: string }) => {
    const links = [
        { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
        { name: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
        { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    ];

    return (
        <nav aria-label="Share this page" className="my-4 flex flex-wrap justify-center gap-4 text-sm">
            {links.map(link => (
                <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">
                    Share on {link.name}{" "}
                    <span className="sr-only">(opens in a new tab)</span>
                </a>
            ))}
        </nav>
    );
};

export default ShareLinks;
