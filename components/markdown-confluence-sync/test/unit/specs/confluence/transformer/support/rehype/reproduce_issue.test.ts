import rehypeParse from "rehype-parse";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

import rehypeReplaceCodeBlocks from "../../../../../../../src/lib/confluence/transformer/support/rehype/rehype-replace-code-blocks";

describe("rehype-replace-code-blocks reproduction", () => {
  it("should replace code block with language and filename to Confluence code macro", () => {
    // Arrange
    const html = '<pre><code class="language-javascript:teste.js">/**\\n * Exemplo de função JavaScript\\n * @param {string} name \\n */\\nfunction greet(name) {\\n  console.log(\`Olá, \${name}! Este código está sincronizado.\`);\\n}\\n\\ngreet("Confluence");</code></pre>';

    // Act
    const result = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeRaw)
      .use(() => (tree) => {
        console.log("TREE BEFORE TRANSFORMATION:", JSON.stringify(tree, null, 2));
      })
      .use(rehypeReplaceCodeBlocks)
      .use(rehypeStringify, {
        allowDangerousHtml: true,
        closeSelfClosing: true,
        tightSelfClosing: true,
      })
      .processSync(html)
      .toString();

    // Assert
    console.log("RESULT:", result);
    expect(result).toContain('<ac:structured-macro ac:name="code">');
    expect(result).toContain('<ac:parameter ac:name="language">javascript</ac:parameter>');
    expect(result).toContain('<ac:parameter ac:name="title">teste.js</ac:parameter>');
    expect(result).toContain('<ac:plain-text-body><![CDATA[/**\n * Exemplo de função JavaScript\n * @param {string} name \n */\nfunction greet(name) {\n  console.log(`Olá, ${name}! Este código está sincronizado.`);\n}\n\ngreet("Confluence");]]></ac:plain-text-body>');
  });
});
