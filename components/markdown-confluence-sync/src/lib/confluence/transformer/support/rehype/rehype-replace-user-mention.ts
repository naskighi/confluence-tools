// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import type { Element as HastElement, Root, Text as HastText } from "hast";
import type { Plugin as UnifiedPlugin } from "unified";

import { visit } from "unist-util-visit";

/**
 * UnifiedPlugin to replace user mentions (@username) with Confluence's user macro.
 * Supports:
 * - @username in text nodes
 */
const rehypeReplaceUserMention: UnifiedPlugin<[], Root> =
  function rehypeReplaceUserMention() {
    return function transformer(tree) {
      const userRegex = /@([a-zA-Z0-9._-]+)/g;

      visit(tree, "text", (node: any, index: number | null, parent: any) => {
        if (!parent || index === null) return;

        const textNode = node as HastText;
        // Skip processing if inside a code block or preformatted text
        if (parent.tagName === "pre" || parent.tagName === "code") {
          return;
        }

        const value = node.value;
        const matches = [...value.matchAll(userRegex)];

        if (matches.length > 0) {
          const newChildren: (HastElement | HastText)[] = [];
          let lastIndex = 0;

          for (const match of matches) {
            const matchIndex = match.index!;
            const username = match[1];

            // Add text before the match
            if (matchIndex > lastIndex) {
              newChildren.push({
                type: "text",
                value: value.slice(lastIndex, matchIndex),
              });
            }

            // Add the user mention macro
            const isAccountId = /^\d+$/.test(username) || username.includes(":");
            newChildren.push(createUserMentionMacro(username, isAccountId));

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
 * Creates a Confluence user-mention macro HAST element
 */
function createUserMentionMacro(identifier: string, isAccountId: boolean): HastElement {
  return {
    type: "element",
    tagName: "ac:link",
    children: [
      {
        type: "element" as const,
        tagName: "ri:user",
        properties: isAccountId 
          ? { "ri:account-id": identifier }
          : { "ri:username": identifier },
        children: [],
      },
    ],
  };
}

export default rehypeReplaceUserMention;
