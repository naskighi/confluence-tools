// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import type { Element as HastElement, Root, Text as HastText } from "hast";
import type { Plugin as UnifiedPlugin } from "unified";

import { visit } from "unist-util-visit";

/**
 * UnifiedPlugin to replace anchor markers with Confluence's anchor macro.
 * Supports:
 * - {#anchor-name} in text nodes
 */
const rehypeReplaceAnchor: UnifiedPlugin<[], Root> =
  function rehypeReplaceAnchor() {
    return function transformer(tree) {
      const anchorRegex = /\{#(.*?)\}/gi;

      visit(tree, "text", (node: any, index: number | null, parent: any) => {
        if (!parent || index === null) return;

        const textNode = node as HastText;
        // Skip processing if inside a code block or preformatted text
        if (parent.tagName === "pre" || parent.tagName === "code") {
          return;
        }

        const value = textNode.value;
        const matches = [...value.matchAll(anchorRegex)];

        if (matches.length > 0) {
          const newChildren: (HastElement | HastText)[] = [];
          let lastIndex = 0;

          for (const match of matches) {
            const matchIndex = match.index!;
            const anchorName = match[1];

            // Add text before the match
            if (matchIndex > lastIndex) {
              newChildren.push({
                type: "text",
                value: value.slice(lastIndex, matchIndex),
              });
            }

            // Add the anchor macro
            newChildren.push(createAnchorMacro(anchorName));

            lastIndex = matchIndex + match[0].length;
          }

          // Add remaining text after the last match
          if (lastIndex < value.length) {
            newChildren.push({
              type: "text",
              value: value.slice(lastIndex),
            });
          }

          // Replace the original text node with the new sequence of nodes
          parent.children.splice(index, 1, ...newChildren);

          // Skip the newly inserted nodes to avoid re-processing
          return index + newChildren.length;
        }
      });
    };
  };

/**
 * Creates a Confluence anchor macro HAST element
 */
function createAnchorMacro(name: string): HastElement {
  return {
    type: "element",
    tagName: "ac:structured-macro",
    properties: {
      "ac:name": "anchor",
    },
    children: [
      {
        type: "element" as const,
        tagName: "ac:parameter",
        properties: { "ac:name": "" },
        children: [{ type: "text", value: name }],
      },
    ],
  };
}

export default rehypeReplaceAnchor;
