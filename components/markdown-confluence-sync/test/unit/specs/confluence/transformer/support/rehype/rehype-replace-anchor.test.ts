// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

import rehypeReplaceAnchor from "@src/lib/confluence/transformer/support/rehype/rehype-replace-anchor";

describe("rehype-replace-anchor", () => {
  it("should be defined", () => {
    expect(rehypeReplaceAnchor).toBeDefined();
  });

  it("should replace {#name} text with Confluence anchor macro", () => {
    // Arrange
    const html = "<p>Section {#intro}</p>";

    // Act
    const result = unified()
      .use(rehypeParse)
      .use(rehypeStringify)
      .use(rehypeReplaceAnchor)
      .processSync(html)
      .toString();

    // Assert
    expect(result).toContain('<p>Section <ac:structured-macro ac:name="anchor"><ac:parameter ac:name="">intro</ac:parameter></ac:structured-macro></p>');
  });

  it("should do nothing to text without anchor pattern", () => {
    // Arrange
    const html = "<p>just text</p>";

    // Act
    const result = unified()
      .use(rehypeParse)
      .use(rehypeStringify)
      .use(rehypeReplaceAnchor)
      .processSync(html)
      .toString();

    // Assert
    expect(result).toContain("<p>just text</p>");
  });
});
