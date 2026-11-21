import { serializeStructuredData, type JsonLd } from "@/libs/structured-data";

export default function StructuredData({ data }: { data: JsonLd }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: serializeStructuredData(data),
            }}
        />
    );
}
