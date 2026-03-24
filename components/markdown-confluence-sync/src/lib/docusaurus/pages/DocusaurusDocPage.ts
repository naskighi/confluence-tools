// SPDX-FileCopyrightText: 2024 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import { existsSync, lstatSync } from "node:fs";
import { join } from "node:path";

import type { LoggerInterface } from "@mocks-server/logger";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkFlexibleContainers from "remark-flexible-containers";
import remarkParseFrontmatter from "remark-parse-frontmatter";
import type { VFile } from "vfile";

import {
  isSupportedFile,
  readMarkdownAndPatchDocusaurusAdmonitions,
} from "../util/files.js";

import type {
  DocusaurusDocPageConstructor,
  DocusaurusDocPageInterface,
  DocusaurusDocPageMeta,
  DocusaurusDocPageOptions,
} from "./DocusaurusDocPage.types.js";
import { InvalidMarkdownFormatException } from "./errors/InvalidMarkdownFormatException.js";
import { InvalidPathException } from "./errors/InvalidPathException.js";
import { PathNotExistException } from "./errors/PathNotExistException.js";
import remarkReplaceAdmonitions from "./support/remark/remark-replace-admonitions.js";
import remarkValidateFrontmatter from "./support/remark/remark-validate-frontmatter.js";
import type { FrontMatter } from "./support/validators/FrontMatterValidator.js";
import { FrontMatterValidator } from "./support/validators/FrontMatterValidator.js";
import {
  ContentPreprocessor,
  FileMetadata,
} from "../../MarkdownConfluenceSync.types.js";
import { TitleRequiredException } from "./errors/TitleRequiredException.js";

export const DocusaurusDocPage: DocusaurusDocPageConstructor = class DocusaurusDocPage
  implements DocusaurusDocPageInterface
{
  protected _vFile: VFile;
  protected _logger?: LoggerInterface;
  protected _metadata?: FileMetadata;
  protected _contentPreprocessor?: ContentPreprocessor;
  private _meta: DocusaurusDocPageMeta;

  constructor(path: string, options?: DocusaurusDocPageOptions) {
    this._logger = options?.logger;
    this._contentPreprocessor = options?.contentPreprocessor;

    const absolutePath = join(path);

    if (!existsSync(absolutePath)) {
      throw new PathNotExistException(`Path ${path} does not exist`);
    }
    if (!lstatSync(path).isFile()) {
      throw new InvalidPathException(`Path ${path} is not a file`);
    }
    if (!isSupportedFile(path)) {
      throw new InvalidPathException(`Path ${path} is not a markdown file`);
    }

    this._metadata = options?.filesMetadata?.find(
      (file) => file.path === absolutePath,
    );

    try {
      this._vFile = this._parseFile(path);
    } catch (e) {
      this._logger?.error((e as Error).toString());
      throw new InvalidMarkdownFormatException(
        `Invalid markdown format: ${path}`,
        { cause: e },
      );
    }

    this._getMeta();
  }

  public get isCategory(): boolean {
    return false;
  }

  public get path(): string {
    return this._vFile.path;
  }

  public get meta(): DocusaurusDocPageMeta {
    return this._meta;
  }

  public get content(): string {
    return this._vFile.toString();
  }

  private _getMeta() {
    const frontmatter = this._vFile.data.frontmatter as FrontMatter;
    const title =
      this._metadata?.title || frontmatter.title || this._vFile.data.title;
    const syncToConfluence =
      this._metadata?.sync !== undefined
        ? this._metadata.sync
        : frontmatter.sync_to_confluence;
    const confluenceShortName =
      this._metadata?.shortName || frontmatter.confluence_short_name;
    const confluenceTitle =
      this._metadata?.title || frontmatter.confluence_title;
    const confluencePageId =
      this._metadata?.id || frontmatter.confluence_page_id;
    const labels = this._metadata?.labels || frontmatter.labels;

    if (!title) {
      throw new TitleRequiredException(this.path);
    }

    this._meta = {
      title: title as string,
      syncToConfluence,
      confluenceShortName,
      confluenceTitle,
      confluencePageId,
      labels,
    };
  }

  protected _parseFile(path: string): VFile {
    const file = readMarkdownAndPatchDocusaurusAdmonitions(path, {
      logger: this._logger,
      contentPreprocessor: this._contentPreprocessor,
    });
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkFlexibleContainers)
      .use(remarkFrontmatter)
      .use(remarkDirective)
      .use(remarkParseFrontmatter)
      .use(remarkValidateFrontmatter, FrontMatterValidator)
      .use(remarkReplaceAdmonitions)
      .use(() => (tree: any, vFile: VFile) => {
        // Fallback: extract title from first H1 heading if not present in frontmatter
        if (!vFile.data.frontmatter || !(vFile.data.frontmatter as any).title) {
          const firstH1 = tree.children.find(
            (node: any) => node.type === "heading" && node.depth === 1,
          );
          if (firstH1) {
            // Extract text from the H1 heading
            vFile.data.title = firstH1.children
              .filter((child: any) => child.type === "text")
              .map((child: any) => child.value)
              .join("");
          }
        }
      });

    const tree = processor.parse(file);
    processor.runSync(tree, file);
    return file;
  }
};
