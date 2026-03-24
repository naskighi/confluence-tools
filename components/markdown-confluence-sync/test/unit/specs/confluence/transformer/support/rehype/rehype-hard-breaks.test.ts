// SPDX-FileCopyrightText: 2024 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

import rehypeHardBreaks from "@src/lib/confluence/transformer/support/rehype/rehype-hard-breaks";

describe("rehype-hard-breaks", () => {
  it("should be defined", () => {
    expect(rehypeHardBreaks).toBeDefined();
  });

  it("should replace soft breaks with <br /> in paragraphs", () => {
    // Arrange
    const html = "<p>line 1\nline 2</p>";

    // Act
    const result = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeHardBreaks)
      .use(rehypeStringify)
      .processSync(html)
      .toString();

    // Assert
    expect(result).toBe("<p>line 1<br>line 2</p>");
  });

  it("should handle multiple soft breaks", () => {
    // Arrange
    const html = "<p>line 1\n\nline 3</p>";

    // Act
    const result = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeHardBreaks)
      .use(rehypeStringify)
      .processSync(html)
      .toString();

    // Assert
    expect(result).toBe("<p>line 1<br><br>line 3</p>");
  });

  it("should not affect other tags", () => {
    // Arrange
    const html = "<div>line 1\nline 2</div>";

    // Act
    const result = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeHardBreaks)
      .use(rehypeStringify)
      .processSync(html)
      .toString();

    // Assert
    expect(result).toBe("<div>line 1\nline 2</div>");
  });

  it("should preserve other elements inside paragraphs", () => {
    // Arrange
    const html = "<p>line 1\n<strong>bold</strong>\nline 2</p>";

    // Act
    const result = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeHardBreaks)
      .use(rehypeStringify)
      .processSync(html)
      .toString();

    // Assert
    expect(result).toBe("<p>line 1<br><strong>bold</strong><br>line 2</p>");
  });
});
