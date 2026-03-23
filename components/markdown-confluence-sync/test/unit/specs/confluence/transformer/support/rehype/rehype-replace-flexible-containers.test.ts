// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import { remark } from "remark";
import remarkFlexibleContainers from "remark-flexible-containers";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

import rehypeReplaceFlexibleContainers from "@src/lib/confluence/transformer/support/rehype/rehype-replace-flexible-containers";

describe("rehypeReplaceFlexibleContainers", () => {
  it("should replace remark-flexible-containers warning with confluence warning macro", async () => {
    const doc = `
::: warning [Watch out]
This is a warning block with title.
:::
`;
    const processor = remark()
      .use(remarkFlexibleContainers)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeReplaceFlexibleContainers)
      .use(rehypeStringify);

    const vfile = await processor.process(doc);
    const result = vfile.toString();
    expect(result).toContain('<ac:structured-macro ac:name="warning">');
    expect(result).toContain('<ac:parameter ac:name="title">Watch out</ac:parameter>');
    expect(result).toContain('<ac:rich-text-body><p>This is a warning block with title.</p></ac:rich-text-body>');
  });

  it("should replace tip without title with confluence tip macro", async () => {
    const doc = `
::: tip
This is a tip.
:::
`;
    const processor = remark()
      .use(remarkFlexibleContainers)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeReplaceFlexibleContainers)
      .use(rehypeStringify);

    const vfile = await processor.process(doc);
    const result = vfile.toString();
    
    expect(result).toContain('<ac:structured-macro ac:name="tip">');
    expect(result).not.toContain('<ac:parameter ac:name="title">');
    expect(result).toContain('<ac:rich-text-body><p>This is a tip.</p></ac:rich-text-body>');
  });

  it("should handle custom AST with remark-container-content wrapper correctly", async () => {
    // Manually testing the rehype transformation with a crafted element
    // because remark-flexible-containers might or might not generate this structure depending on options
    const doc = `
<div class="remark-container danger">
  <div class="remark-container-title">Danger zone</div>
  <div class="remark-container-content">
    <p>Do not touch</p>
  </div>
</div>
`;
    // We can use rehypeParse directly to parse the html string since it's just testing the rehype plugin
    const { unified } = await import("unified");
    const { default: rehypeParse } = await import("rehype-parse");

    const processor = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeReplaceFlexibleContainers)
      .use(rehypeStringify);

    const vfile = processor.processSync(doc);
    const result = vfile.toString();
    console.log("ACTUAL RESULT:\n", result);
    
    expect(result).toContain('<ac:structured-macro ac:name="warning">');
    expect(result).toContain('<ac:parameter ac:name="title">Danger');
    expect(result).toContain('zone</ac:parameter>');
    expect(result).toContain('<ac:rich-text-body>');
    expect(result).toContain('Do not touch');
  });

  it("should fall back to info for unknown or empty type", async () => {
    const doc = `
<div class="remark-container">
  <p>Empty type</p>
</div>
<div class="remark-container unknown">
  <p>Unknown type</p>
  <div>Normal div</div>
</div>
`;
    // We can use rehypeParse directly to parse the html string since it's just testing the rehype plugin
    const { unified } = await import("unified");
    const { default: rehypeParse } = await import("rehype-parse");

    const processor = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeReplaceFlexibleContainers)
      .use(rehypeStringify);

    const vfile = processor.processSync(doc);
    const result = vfile.toString();
    
    expect(result).toContain('<ac:structured-macro ac:name="info">');
  });

  it("should convert rich text in title to plain text", async () => {
    const doc = `
::: info **Bold Title** with *italic*
Some content.
:::
`;
    const processor = remark()
      .use(remarkFlexibleContainers)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeReplaceFlexibleContainers)
      .use(rehypeStringify);

    const vfile = await processor.process(doc);
    const result = vfile.toString();
    
    expect(result).toContain('<ac:parameter ac:name="title">Bold Title with italic</ac:parameter>');
  });
});

