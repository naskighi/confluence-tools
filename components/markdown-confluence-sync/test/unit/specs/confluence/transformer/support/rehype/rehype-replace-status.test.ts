// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

import rehypeReplaceStatus from "@src/lib/confluence/transformer/support/rehype/rehype-replace-status";

describe("rehype-replace-status", () => {
  it("should be defined", () => {
    expect(rehypeReplaceStatus).toBeDefined();
  });

  it("should replace (status: TEXT color: COLOR) text with Confluence status macro", () => {
    // Arrange
    const html = "<p>(status: In Progress color: blue)</p>";

    // Act
    const result = unified()
      .use(rehypeParse)
      .use(rehypeStringify)
      .use(rehypeReplaceStatus)
      .processSync(html)
      .toString();

    // Assert
    expect(result).toContain('<ac:structured-macro ac:name="status">');
    expect(result).toContain('<ac:parameter ac:name="title">In Progress</ac:parameter>');
    expect(result).toContain('<ac:parameter ac:name="colour">Blue</ac:parameter>');
  });

  it("should replace (status: Done color: green) text with Confluence status macro", () => {
    // Arrange
    const html = "<p>(status: Done color: green)</p>";

    // Act
    const result = unified()
      .use(rehypeParse)
      .use(rehypeStringify)
      .use(rehypeReplaceStatus)
      .processSync(html)
      .toString();

    // Assert
    expect(result).toContain('<ac:parameter ac:name="title">Done</ac:parameter>');
    expect(result).toContain('<ac:parameter ac:name="colour">Green</ac:parameter>');
  });

  it("should replace :::status container with Confluence status macro", () => {
    // Arrange
    const html = '<div class="remark-container status"><div class="remark-container-title">Review</div></div>';

    // Act
    const result = unified()
      .use(rehypeParse)
      .use(rehypeStringify)
      .use(rehypeReplaceStatus)
      .processSync(html)
      .toString();

    // Assert
    expect(result).toContain('<ac:structured-macro ac:name="status">');
    expect(result).toContain('<ac:parameter ac:name="title">Review</ac:parameter>');
  });

  it("should use default color Grey if color is unknown", () => {
      // Arrange
      const html = "<p>(status: Unknown color: magic)</p>";
  
      // Act
      const result = unified()
        .use(rehypeParse)
        .use(rehypeStringify)
        .use(rehypeReplaceStatus)
        .processSync(html)
        .toString();
  
      // Assert
      expect(result).toContain('<ac:parameter ac:name="colour">Grey</ac:parameter>');
    });
});
