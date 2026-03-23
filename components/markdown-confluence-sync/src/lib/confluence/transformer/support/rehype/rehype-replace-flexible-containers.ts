// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import type { Element as HastElement, Root, Text as HastText, ElementContent } from "hast";
import type { Plugin as UnifiedPlugin } from "unified";

import { toString as hastToString } from "hast-util-to-string";

import { replace } from "../../../../support/unist/unist-util-replace.js";

/**
 * Confluence macro names for different container types
 */
const CONTAINER_TO_MACRO: Record<string, string> = {
  info: "info",
  note: "info",
  tip: "tip",
  success: "tip",
  warning: "warning",
  danger: "warning",
  caution: "warning",
  important: "note",
  expand: "expand",
  details: "expand",
  collapse: "expand",
};

/**
 * UnifiedPlugin to replace remark-flexible-containers div output with Confluence's
 * structured info/note/warning/tip macro format.
 *
 * @see {@link https://developer.atlassian.com/server/confluence/confluence-storage-format/ | Confluence Storage Format }
 */
const rehypeReplaceFlexibleContainers: UnifiedPlugin<[], Root> =
  function rehypeReplaceFlexibleContainers() {
    return function transformer(tree) {
      replace(tree, { type: "element", tagName: "div" }, (node) => {
        const className = node.properties?.className;
        
        if (!Array.isArray(className) || !className.includes("remark-container")) {
          // Not a remark-flexible-container div
          return node;
        }

        // Find the specific container type from class list 
        // Example: class="remark-container warning"
        const containerType = className.find(c => c !== "remark-container") as string | undefined;
        
        // Match undefined or unknown types to "info"
        const macroName = CONTAINER_TO_MACRO[(containerType || "").toLowerCase()] || "info";

        let titleContent: ElementContent[] | undefined;
        let bodyContent: ElementContent[] = [];

        // Extract Title and content
        node.children.forEach(child => {
            if (child.type === "element" && child.tagName === "div") {
                const childClassName = child.properties?.className;
                if (Array.isArray(childClassName) && childClassName.includes("remark-container-title")) {
                    // Extract title from this div. We can use the children directly or extract text.
                    // The children might be text or other inline elements.
                    titleContent = child.children;
                    return;
                }
            }
            // If it's not the title div, it is part of the body.
            // Some flexible containers put content in `<div class="remark-container-content">` 
            // but older/other versions might just put it directly as children like `<p>...`
            if (child.type === "element" && child.tagName === "div") {
                const childClassName = child.properties?.className;
                if (Array.isArray(childClassName) && childClassName.includes("remark-container-content")) {
                    bodyContent.push(...child.children);
                    return;
                }
            }
            bodyContent.push(child);
        });
        
        // Remove brackets from title if present (e.g. from output like `[Watch out]`)
        if (titleContent && titleContent.length === 1 && titleContent[0].type === "text") {
            let text = (titleContent[0] as HastText).value;
            if (text.startsWith("[") && text.endsWith("]")) {
                titleContent[0] = { ...titleContent[0], value: text.substring(1, text.length - 1) };
            }
        }

        // If no body content, maybe nothing to return or just empty body
        // Build the Confluence macro
        const macroChildren: ElementContent[] = [];

        // Fallback for expand titles: if no title div was found, use the first child as title
        if (!titleContent && macroName === "expand" && bodyContent.length > 0) {
            const firstChild = bodyContent[0];
            if (firstChild.type === "element" && firstChild.tagName === "p") {
                titleContent = firstChild.children;
                bodyContent.shift();
            } else if (firstChild.type === "text") {
                titleContent = [firstChild];
                bodyContent.shift();
            }
        }

        // Add title parameter
        if (titleContent && titleContent.length > 0) {
            macroChildren.push({
                type: "element" as const,
                tagName: "ac:parameter",
                properties: {
                    "ac:name": "title",
                },
                children: [
                    {
                        type: "text",
                        value: hastToString({ type: "element", tagName: "span", properties: {}, children: titleContent }),
                    },
                ],
            });
        }

        // Add the content in a rich text body
        macroChildren.push({
          type: "element" as const,
          tagName: "ac:rich-text-body",
          properties: {},
          children: bodyContent,
        });

        return {
          type: "element" as const,
          tagName: "ac:structured-macro",
          properties: {
            "ac:name": macroName,
          },
          children: macroChildren,
        };
      });
    };
  };

export default rehypeReplaceFlexibleContainers;
