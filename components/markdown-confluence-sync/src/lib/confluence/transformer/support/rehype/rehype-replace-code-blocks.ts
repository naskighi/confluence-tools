// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import type { Element as HastElement, Root, Text as HastText } from "hast";
import type { Plugin as UnifiedPlugin } from "unified";

import { replace } from "../../../../support/unist/unist-util-replace.js";

/**
 * UnifiedPlugin to replace `<pre><code>` HastElements with Confluence's
 * structured code macro format.
 *
 * @see {@link https://developer.atlassian.com/server/confluence/confluence-storage-format/ | Confluence Storage Format }
 *
 * @example
 *  <pre><code class="language-javascript">const x = 42;</code></pre>
 *  // becomes
 *  <ac:structured-macro ac:name="code">
 *    <ac:parameter ac:name="language">javascript</ac:parameter>
 *    <ac:plain-text-body><![CDATA[const x = 42;]]></ac:plain-text-body>
 *  </ac:structured-macro>
 */
const rehypeReplaceCodeBlocks: UnifiedPlugin<[], Root> =
  function rehypeReplaceCodeBlocks() {
    return function transformer(tree) {
      replace(tree, { type: "element", tagName: "pre" }, (node) => {
        // Check if this pre element contains a code element
        const codeElement = node.children.find(
          (child) =>
            child.type === "element" &&
            (child as HastElement).tagName === "code",
        ) as HastElement | undefined;

        if (!codeElement) {
          // If there's no code element, return the pre element unchanged
          return node;
        }

        // Extract the language and title from the code element's className
        const { language, title: titleFromClass } =
          extractLanguageAndTitle(codeElement);

        // Extract title from metadata (Docusaurus/MDX style)
        let title = titleFromClass;
        if (!title && codeElement.data?.meta) {
          const meta = codeElement.data.meta as string;
          const titleMatch = meta.match(/title="([^"]*)"/);
          title = titleMatch ? titleMatch[1] : undefined;
        }

        // Extract the text content from the code element
        const codeContent = extractTextContent(codeElement);

        // Build the Confluence code macro
        const macroChildren: HastElement[] = [];

        // Add language parameter if present
        if (language) {
          macroChildren.push({
            type: "element" as const,
            tagName: "ac:parameter",
            properties: {
              "ac:name": "language",
            },
            children: [
              {
                type: "raw" as const,
                value: language,
              },
            ],
          });
        }

        // Add title parameter if present
        if (title) {
          macroChildren.push({
            type: "element" as const,
            tagName: "ac:parameter",
            properties: {
              "ac:name": "title",
            },
            children: [
              {
                type: "raw" as const,
                value: title,
              },
            ],
          });
        }

        // Add the code content
        // Note: We use a text node with the raw CDATA markup
        // The rehypeStringify with allowDangerousHtml will preserve it
        macroChildren.push({
          type: "element" as const,
          tagName: "ac:plain-text-body",
          properties: {},
          children: [
            {
              type: "raw" as const,
              value: `<![CDATA[${codeContent}]]>`,
            },
          ],
        });

        return {
          type: "element" as const,
          tagName: "ac:structured-macro",
          properties: {
            "ac:name": "code",
          },
          children: macroChildren,
        };
      });
    };
  };

/**
 * Extract the language and title from the code element's className property.
 * Markdown renderers typically add classes like "language-javascript"
 * to code elements.
 * This function also handles titles in the format "language-javascript:MyTitle"
 * or "language-javascript{line:1}:MyTitle".
 *
 * @param codeElement - The code element to extract the language from
 * @returns An object containing the language and title (both optional)
 */
function extractLanguageAndTitle(codeElement: HastElement): {
  language?: string;
  title?: string;
} {
  const className = codeElement.properties?.className;

  if (!className) {
    return {};
  }

  // className is always an array of strings, but we check it for safety
  // istanbul ignore next
  const classNames = Array.isArray(className) ? className : [className];

  // Look for a class that starts with "language-"
  for (const cls of classNames) {
    if (typeof cls === "string" && cls.startsWith("language-")) {
      const fullLang = cls.substring(9); // Remove "language-" prefix

      // Use regex to parse language, metadata (ignored) and title
      // Format: lang{meta}:title
      const regex = /^([^:{ ]*)(?:\{([^}]*)\})?(?::(.*))?$/;
      const match = fullLang.match(regex)!;

      return {
        language: match[1] || undefined,
        title: match[3] || undefined,
      };
    }
  }

  return {};
}

/**
 * Extract all text content from an element recursively.
 *
 * @param element - The element to extract text from
 * @returns The concatenated text content
 */
function extractTextContent(element: HastElement): string {
  let text = "";

  for (const child of element.children) {
    if (child.type === "text") {
      text += (child as HastText).value;
    } else if (child.type === "element") {
      text += extractTextContent(child as HastElement);
    }
  }

  return text;
}

export default rehypeReplaceCodeBlocks;
