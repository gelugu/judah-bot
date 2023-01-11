import { exit } from "process";
import { ITask } from "./interfaces/project";

if (!process.env.NOTION_DB_ID) {
  console.error("NOTION_DB_ID env must be set");
  exit(1);
}
if (!process.env.NOTION_TOKEN) {
  console.error("NOTION_TOKEN env must be set");
  exit(1);
}

const database = async () => {
  const res = await fetch(
    `https://api.notion.com/v1/databases/${process.env.NOTION_DB_ID}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    }
  );
  return res.json();
};

export const blocks = async (id: string) => {
  const res = await fetch(
    `https://api.notion.com/v1/blocks/${id}/children?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    }
  );
  return res.json();
};

const query = async () => {
  const res = await fetch(
    `https://api.notion.com/v1/databases/${process.env.NOTION_DB_ID}/query`,
    {
      method: "POST",
      body: JSON.stringify({
        filter: {
          or: [
            {
              property: "Name",
              title: { is_not_empty: true },
            },
          ],
        },
        sorts: [
          {
            property: "Date",
            direction: "ascending",
          },
        ],
      }),
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    }
  );
  return res.json();
};

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
    const tasks = (await query()).results;
    return tasks.map((page): ITask => pageToTask(page));
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getPage = async (id: string): Promise<string> => {
  try {
    const page = (await blocks(id)).results;
    const content = page
      .map((b) => {
        if (b.to_do) {
          const state = b.to_do.checked ? "- [x]" : "- [ ]";
          return b.to_do.rich_text
            .map((t) => `${state} ${t.plain_text}`)
            .join("\n");
        } else if (b.heading_3) {
          return b.heading_3.rich_text
            .map((t) => `*${t.plain_text}*`)
            .join("\n");
        } else if (b.paragraph) {
          return b.paragraph.rich_text.map((t) => t.plain_text).join("\n");
        } else return "";
      })
      .join("\n");
    if (content === "") return "No content";
    return content;
  } catch (error) {
    console.error(error);
    return "";
  }
};
