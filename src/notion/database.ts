import { ITask } from "../interfaces/project";
import { fetchBlocks, getDatabase, queryDatabase, updatePage } from ".";

export const pageToTask = (page: any): ITask => {
  let icon = "";
  if (page.icon) {
    if (page.icon.type === "emoji") icon = page.icon.emoji;
    else icon = `Unknown type: ${page.icon.type}`;
  }

  let date: Date | undefined = undefined;
  if (page.properties["Date"].date)
    date = new Date(page.properties["Date"].date.start);

  return {
    id: page.id,
    name: page.properties["Name"].title.map((t) => t.plain_text).join(" "),
    tags: page.properties["Tags"].multi_select.map((t) => t.name),
    createdTime: page.created_time,
    date,
    icon,
    status: page.properties["Status"].status.name,
    url: page.url,
  };
};

export const getTasks = async (): Promise<ITask[]> => {
  try {
    const tasks = (await queryDatabase()).results;
    return tasks.map((page): ITask => pageToTask(page));
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const updateTask = async (
  pageId: string,
  properties: any
): Promise<ITask | undefined> => {
  try {
    const task = await updatePage(pageId, properties);
    console.log(task);
    return pageToTask(task);
  } catch (error) {
    console.error(error);
  }
};

export const getPage = async (id: string): Promise<string> => {
  try {
    const page = (await fetchBlocks(id)).results;
    const content = page
      .map((b) => {
        if (b.to_do) {
          return parseToDo(b);
        } else if (b.heading_1 || b.heading_2 || b.heading_3) {
          return parseHeader(b);
        } else if (b.paragraph) {
          return parseParagraph(b);
        } else if (b.bulleted_list_item) {
          return parseBulletedListItem(b);
        } else if (b.numbered_list_item) {
          return parseNumberedListItem(b);
        } else if (b.toggle) {
          return parseToggle(b);
        } else if (b.quote) {
          return parseQuote(b);
        } else if (b.callout) {
          return parseCallout(b);
        } else if (b.synced_block) {
          return parseSyncedBlock(b);
        } else if (b.template) {
          return parseTemplate(b);
        } else if (b.column) {
          return parseColumn(b);
        } else if (b.child_page) {
          return parseChildPage(b);
        } else if (b.child_database) {
          return parseChildDatabase(b);
        } else if (b.table) {
          return parseTable(b);
        } else return "";
      })
      .join("\n");
    return content;
  } catch (error) {
    console.error(error);
    return "";
  }
};
const parseHeader = (block: any): string => {
  if (block.heading_1) {
    return block.heading_1.rich_text
      .map((t) => t.plain_text.toUpperCase())
      .join("\n");
  }
  if (block.heading_2) {
    return block.heading_2.rich_text
      .map((t) => t.plain_text.toUpperCase())
      .join("\n");
  }
  if (block.heading_3) {
    return block.heading_3.rich_text
      .map((t) => t.plain_text.toUpperCase())
      .join("\n");
  }
  return "";
};
const parseParagraph = (block: any): string => {
  if (block.paragraph) {
    return block.paragraph.rich_text.map((t) => t.plain_text).join("\n");
  }
  return "";
};
const parseBulletedListItem = (block: any): string => {
  if (block.bulleted_list_item) {
    return block.bulleted_list_item.rich_text
      .map((t) => "- " + t.plain_text)
      .join("\n");
  }
  return "";
};
const parseNumberedListItem = (block: any): string => {
  if (block.numbered_list_item) {
    return block.numbered_list_item.rich_text
      .map((t, i) => `${i + 1}. ${t.plain_text}`)
      .join("\n");
  }
  return "";
};
const parseToggle = (block: any): string => {
  if (block.toggle) {
    return block.toggle.rich_text.map((t) => t.plain_text).join("\n");
  }
  return "";
};
const parseToDo = (block: any): string => {
  if (block.to_do) {
    const checked = block.to_do.checked ? "- \\[x]" : "- \\[ ]";
    return block.to_do.rich_text
      .map((t) => `${checked} ${t.plain_text}`)
      .join("\n");
  }
  return "";
};
const parseQuote = (block: any): string => {
  if (block.quote) {
    return block.quote.rich_text.map((t) => "> " + t.plain_text).join("\n");
  }
  return "";
};
const parseCallout = (block: any): string => {
  if (block.callout) {
    return block.callout.rich_text.map((t) => `\`${t.plain_text}\``).join("\n");
  }
  return "";
};
const parseSyncedBlock = (block: any): string => {
  if (block.synced_block) {
    return block.synced_block.rich_text.map((t) => t.plain_text).join("\n");
  }
  return "";
};
const parseTemplate = (block: any): string => {
  if (block.template) {
    return block.template.rich_text.map((t) => t.plain_text).join("\n");
  }
  return "";
};
const parseColumn = (block: any): string => {
  if (block.column) {
    return block.column.rich_text.map((t) => t.plain_text).join("\n");
  }
  return "";
};
const parseChildPage = (block: any): string => {
  if (block.child_page) {
    return block.child_page.rich_text.map((t) => t.plain_text).join("\n");
  }
  return "";
};
const parseChildDatabase = (block: any): string => {
  if (block.child_database) {
    return block.child_database.rich_text.map((t) => t.plain_text).join("\n");
  }
  return "";
};
const parseTable = (block: any): string => {
  if (block.table) {
    return block.table.rich_text.map((t) => t.plain_text).join("\n");
  }
  return "";
};

export const getTags = async (): Promise<string[]> => {
  try {
    const database = await getDatabase();
    return database.properties["Tags"].multi_select.options.map((o) => o.name);
  } catch (error) {
    console.error(error);
    return [];
  }
};
