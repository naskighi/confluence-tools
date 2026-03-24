// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

import rehypeReplaceToc from "@src/lib/confluence/transformer/support/rehype/rehype-replace-toc";

describe("rehype-replace-toc", () => {
  it("should be defined", () => {
    expect(rehypeReplaceToc).toBeDefined();
  });

  it("should replace [[toc]] text with Confluence TOC macro", () => {
    // Arrange
    const html = "<p>[[toc]]</p>";

    // Act & Assert
    expect(
      unified()
        .use(rehypeParse)
        .use(rehypeStringify)
        .use(rehypeReplaceToc)
        .processSync(html)
        .toString(),
    ).toContain('<ac:structured-macro ac:name="toc"></ac:structured-macro>');
  });

  it("should replace [[TOC]] (case insensitive) text with Confluence TOC macro", () => {
    // Arrange
    const html = "<p>[[TOC]]</p>";

    // Act & Assert
    expect(
      unified()
        .use(rehypeParse)
        .use(rehypeStringify)
        .use(rehypeReplaceToc)
        .processSync(html)
        .toString(),
    ).toContain('<ac:structured-macro ac:name="toc"></ac:structured-macro>');
  });

  it("should replace :::toc container with Confluence TOC macro", () => {
    // Arrange
    const html = '<div class="remark-container toc"></div>';

    // Act & Assert
    expect(
      unified()
        .use(rehypeParse)
        .use(rehypeStringify)
        .use(rehypeReplaceToc)
        .processSync(html)
        .toString(),
    ).toContain('<ac:structured-macro ac:name="toc"></ac:structured-macro>');
  });

  it("should not replace other text", () => {
    // Arrange
    const html = "<p>some other text</p>";

    // Act & Assert
    expect(
      unified()
        .use(rehypeParse)
        .use(rehypeStringify)
        .use(rehypeReplaceToc)
        .processSync(html)
        .toString(),
    ).toContain("<p>some other text</p>");
  });
});
