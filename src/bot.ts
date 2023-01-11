import { Bot as GrammyBot, InlineKeyboard, Keyboard } from "grammy";
import { ICommand } from "./interfaces/bot";
import { log } from "./log";
import { getPage, getTasks } from "./notion";

if (!process.env.TG_BOT_TOKEN) {
  console.error("TG_BOT_TOKEN must be set in environment variable");
  process.exit(1);
}

if (!process.env.TG_OWNER) {
  console.error("TG_OWNER must be set in environment variable");
  process.exit(1);
}

const commands: ICommand[] = [
  {
    name: "start",
    description: "Get start with bot",
    response: `Type (or press) /all for start`,
  },
  { name: "all", description: "List all tasks" },
  { name: "today", description: "List today tasks" },
];

class Bot extends GrammyBot {
  constructor(token: string) {
    super(token);

    log.info("Setup bot");
    this.setupCommands();
    this.setupCallbacks();
  }

  mainKeyboard = new Keyboard().text("/all").text("/today");

  private async setupCommands() {
    log.info("Set commands descriptions");
    await this.api.setMyCommands(
      commands.map((c) => ({ command: c.name, description: c.description }))
    );

    log.info("Configure commands response");
    commands
      .filter((c) => c.response)
      .forEach((c) => {
        this.command(c.name, async (ctx) => {
          if (c.response)
            await ctx.reply(c.response, {
              disable_web_page_preview: true,
              parse_mode: "Markdown",
            });
        });
      });

    this.command("all", async (ctx) => {
      try {
        log.info("Handle 'all' command");

        const tasks = await getTasks();
        log.info(
          `Found ${tasks.length} tasks:\n${tasks.map((p) => p.name).join(", ")}`
        );

        let message = `${tasks.length} tasks.`;
        let keyboard: InlineKeyboard | undefined = undefined;
        if (tasks.length > 0) {
          message += "\nChoose task:";
          keyboard = new InlineKeyboard();
          tasks.forEach((tasks) => {
            keyboard?.text(tasks.name, `task:${tasks.id}`).row();
          });
        }
        await ctx.reply(message, { reply_markup: keyboard });
      } catch (error) {
        log.error(error);
      }
    });

    this.command("today", async (ctx) => {
      try {
        log.info("Handle 'today' command");

        const tasks = (await getTasks()).filter(
          (t) => t.date?.toDateString() == new Date().toDateString()
        );
        log.info(
          `Found ${tasks.length} tasks:\n${tasks.map((p) => p.name).join(", ")}`
        );

        let message = `${tasks.length} tasks.`;
        let keyboard: InlineKeyboard | undefined = undefined;
        if (tasks.length > 0) {
          message += "\nChoose task:";
          keyboard = new InlineKeyboard();
          tasks.forEach((tasks) => {
            keyboard?.text(tasks.name, `task:${tasks.id}`).row();
          });
        }
        await ctx.reply(message, { reply_markup: keyboard });
      } catch (error) {
        log.error(error);
      }
    });
  }

  private async setupCallbacks() {
    this.on("callback_query:data", async (ctx) => {
      if (ctx.from.id.toString() !== process.env.TG_OWNER) {
        log.warning(`Someone trying to work with bot: ${ctx.from.username}`);
        ctx.reply("You not allowed to use this bot. May be later...");
        this.message(
          `Some one tried to use this bot:\n${new Date()}\n${
            ctx.from.username
          } (${ctx.from.first_name} ${ctx.from.last_name})`
        );
        return;
      }
      try {
        switch (ctx.callbackQuery.data.split(":")[0]) {
          case "task":
            log.info("Handle 'task' callback");
            this.callbackChooseTask(ctx.callbackQuery.data.split(":")[1]);
            break;

          default:
            break;
        }
      } catch (error) {
        console.error(error);
      }
    });
  }

  private async callbackChooseTask(taskId: string) {
    const message = await getPage(taskId);
    this.message(message);
  }

  async message(
    text: string,
    keyboard: InlineKeyboard | Keyboard | undefined = undefined
  ) {
    this.api.sendMessage(process.env.TG_OWNER!.toString(), text, {
      disable_web_page_preview: true,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }
}

export const bot = new Bot(process.env.TG_BOT_TOKEN);
