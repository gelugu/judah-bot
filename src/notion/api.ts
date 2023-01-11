import { exit } from "process";

if (!process.env.NOTION_DB_ID) {
  console.error("NOTION_DB_ID env must be set");
  exit(1);
}
const dbId = process.env.NOTION_DB_ID;
if (!process.env.NOTION_TOKEN) {
  console.error("NOTION_TOKEN env must be set");
  exit(1);
}
const notionToken = process.env.NOTION_TOKEN;

const apiUrl = "https://api.notion.com/v1";
const headers = {
  Authorization: `Bearer ${notionToken}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

export const updatePage = async (pageId: string, properties: any) => {
  const res = await fetch(`${apiUrl}/pages/${pageId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ properties }),
  });
  return res.json();
};

export const fetchBlocks = async (id: string) => {
  const res = await fetch(`${apiUrl}/blocks/${id}/children?page_size=100`, {
    headers,
  });
  return res.json();
};

export const queryDatabase = async () => {
  const res = await fetch(`${apiUrl}/databases/${dbId}/query`, {
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
    headers,
  });
  return res.json();
};

export const getDatabase = async () => {
  const res = await fetch(`${apiUrl}/databases/${dbId}`, {
    headers,
  });
  return res.json();
};
