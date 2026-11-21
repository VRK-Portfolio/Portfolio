import { describe, test, expect } from "vitest";
import { truncateText, countWords, formatDate, htmlToPlainText } from "../utils"; // Adjust the import path as needed

describe("Plain text for blog metadata and previews", () => {
    test("removes markup and non-content scripts while decoding common and numeric entities", () => {
        expect(htmlToPlainText('<style>hidden</style><script>hidden()</script><h2>Mastra &amp; EDS</h2><p>It&#39;s&nbsp;ready &#x1F680; &quot;now&quot;.</p>'))
            .toBe('Mastra & EDS It\'s ready \u{1F680} "now".');
    });
    test("preserves unknown entities and invalid Unicode entities without throwing", () => {
        expect(htmlToPlainText("<p>&unknown; &#99999999; &#xD800;</p>")).toBe("&unknown; &#99999999; &#xD800;");
    });
});

describe("Utils Truncate Text Tests", () => {
   test("check the truncateText function", () => {
       const text = "This is a long text that needs to be truncated.";
       const maxLength = 20;
       const truncated = truncateText(text, maxLength);
       expect(truncated.length-3).toBeLessThanOrEqual(maxLength);
   });

   test("check the truncateText function with short text", () => {
       const text = "Short text";
       const maxLength = 20;
       const truncated = truncateText(text, maxLength);
       expect(truncated).toBe(text);
   });

   test("check the truncateText function with exact length text", () => {
       const text = "Exact length text";
       const maxLength = text.length;
       const truncated = truncateText(text, maxLength);
       expect(truncated).toBe(text);
   });
});

describe("Test Suite for Count Words", () => {
    test("check the countWords function", () => {
        const text = "This is a test text";
        const wordCount = countWords(text);
        expect(wordCount).toBe(5);
    });

    test("check the countWords function with empty text", () => {
        const text = "";
        const wordCount = countWords(text);
        expect(wordCount).toBe(0);
    });

    test("check the countWords function with multiple spaces", () => {
        const text = "This  is   a    test";
        const wordCount = countWords(text);
        expect(wordCount).toBe(4);
    });

    test("check the countWords function with leading and trailing spaces", () => {
        const text = "   This is a test   ";
        const wordCount = countWords(text);
        expect(wordCount).toBe(4);
    });

    test("check the countWords function with punctuation", () => {
        const text = "Hello, world! This is a test.";
        const wordCount = countWords(text);
        expect(wordCount).toBe(6);
    });
})


describe("Utils Format Date Tests", () => {
    test("check the formatDate function", () => {
        const date = new Date("2024-06-01T12:00:00Z");
        const formatted = formatDate(date);
        expect(formatted).toBe("1 June 2024");
    });

    test("check the formatDate function with different date", () => {
        const date = new Date("2024-12-25T12:00:00Z");
        const formatted = formatDate(date);
        expect(formatted).toBe("25 December 2024");
    });

    test("check the formatDate function with invalid date", () => {
        const date = new Date("invalid-date");
        const formatted = formatDate(date);
        expect(formatted).toBe("Invalid Date");
    });

    test("check the formatDate function with date having single digit day", () => {
        const date = new Date("2024-06-05T12:00:00Z");
        const formatted = formatDate(date);
        expect(formatted).toBe("5 June 2024");
    });

    test("get the today's day if the param is not passed", () => {
        const today = new Date();
        const formatted = formatDate();
        expect(formatted).toBe(formatDate(today));
    });
});