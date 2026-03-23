import { toString as hastToString } from "hast-util-to-string";

describe("debug", () => {
    it("should work", () => {
        const node = { type: "element", tagName: "span", properties: {}, children: [{ type: "text", value: "Hello" }] };
        expect(hastToString(node as any)).toBe("Hello");
    });
});
