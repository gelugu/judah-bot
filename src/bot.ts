import { Bot as GrammyBot, Context, InlineKeyboard, Keyboard } from "grammy";
import { ICommand } from "./interfaces/bot";
import { ITask } from "./interfaces/project";
import { log } from "./log";
import { getPage, getTags, getTasks, updateTask } from "./notion";

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
  { name: "unscheduled", description: "List unscheduled tasks" },
  { name: "tags", description: "List tags" },
];

class Bot extends GrammyBot {
  constructor(token: string) {
    super(token);

    log.info("Setup bot");
    this.setupCommands();
    this.setupCallbacks();
  }

  mainKeyboard = new Keyboard()
    .text("/all")
    .text("/today")
    .row()
    .text("/unscheduled")
    .text("/tags")
    .row();

  private async setupCommands() {
    log.info("Set commands descriptions");
    await this.api.setMyCommands(
      commands.map((c) => ({ command: c.name, description: c.description }))
    );

    log.info("Configure commands response");
    commands
      .filter((c) => c.response)
      .forEach((c) => {
        this.command(c.name, async () => {
          if (c.response) await this.message(c.response);
        });
      });

    this.command("all", async () => {
      try {
        log.info("Handle 'all' command");

        const tasks = await getTasks();
        log.info(
          `Found ${tasks.length} tasks:\n${tasks.map((p) => p.name).join(", ")}`
        );

        if (tasks.length > 0) {
          tasks.forEach(async (task) => {
            this.sendTask(task);
          });
        }
      } catch (error) {
        log.error(error);
      }
    });

    this.command("today", async () => {
      try {
        log.info("Handle 'today' command");

        const tasks = (await getTasks()).filter(
          (t) => t.date?.toDateString() == new Date().toDateString()
        );
        log.info(
          `Found ${tasks.length} tasks:\n${tasks.map((p) => p.name).join(", ")}`
        );

        await this.message(`${tasks.length} tasks for today.`);
        tasks.forEach(async (task) => {
          this.sendTask(task);
        });
      } catch (error) {
        log.error(error);
      }
    });

    this.command("unscheduled", async () => {
      try {
        log.info("Handle 'unscheduled' command");

        const tasks = (await getTasks()).filter((t) => !t.date);
        log.info(
          `Found ${tasks.length} tasks:\n${tasks.map((p) => p.name).join(", ")}`
        );

        await this.message(`${tasks.length} unscheduled tasks.`);
        tasks.forEach(async (task) => {
          this.sendTask(task);
        });
      } catch (error) {
        log.error(error);
      }
    });

    this.command("tags", async () => {
      try {
        log.info("Handle 'tags' command");

        const tags = await getTags();
        log.info(`Found ${tags.length} tags:\n${tags.join(", ")}`);

        const keyboard = new InlineKeyboard();
        tags.forEach((t, i) => {
          keyboard.text(t, `tag:${t}`);
          if (i % 4 === 3) keyboard.row();
        });
        await this.message(`Filter tasks by tag:`, keyboard);
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
          case "schedule":
            log.info("Handle 'schedule' callback");
            this.callbackScheduleTask(
              ctx.callbackQuery.data.split(":")[1],
              parseInt(ctx.callbackQuery.data.split(":")[2])
            );
            break;

          case "set_date":
            log.info("Handle 'set_date' callback");
            this.callbackSetDate(
              parseInt(ctx.callbackQuery.data.split(":")[1]),
              ctx.callbackQuery.data.split(":")[2],
              ctx.callbackQuery.data.split(":")[3]
            );
            break;

          case "tag":
            log.info("Handle 'tag' callback");
            this.callbackTag(ctx.callbackQuery.data.split(":")[1]);
            break;

          default:
            break;
        }
      } catch (error) {
        console.error(error);
      }
    });
  }

  private async callbackScheduleTask(
    taskId: string,
    messageId: number | undefined
  ) {
    if (!messageId) throw Error("callbackScheduleTask, can't parse messageId");
    await this.scheduleTask(taskId, messageId);
  }

  private async callbackSetDate(
    messageId: number,
    taskId: string,
    dateString: string
  ) {
    const task = await updateTask(taskId, {
      Date: { date: { start: dateString } },
    });
    if (!task) throw Error("Can't update task");

    const message = await this.renderTaskMessage(task);
    await this.api.editMessageText(process.env.TG_OWNER!, messageId, message, {
      disable_web_page_preview: true,
      parse_mode: "Markdown",
    });
    await this.api.editMessageReplyMarkup(process.env.TG_OWNER!, messageId, {
      reply_markup: this.renderTaskKeyboard(task, messageId),
    });
  }

  private async callbackTag(tag: string) {
    const tasks = (await getTasks()).filter((t) => t.tags.includes(tag));

    tasks.forEach(async (task) => {
      await this.sendTask(task);
    });
  }

  private async scheduleTask(taskId: string, messageId: number) {
    const date = new Date();
    const today = date.toISOString().split("T")[0];
    date.setDate(date.getDate() + 1);
    const tomorrow = date.toISOString().split("T")[0];
    date.setDate(date.getDate() + 6);
    const nextWeek = date.toISOString().split("T")[0];
    date.setDate(date.getDate() - 7);
    date.setMonth(date.getMonth() + 1);
    const nextMonth = date.toISOString().split("T")[0];
    log.info(nextMonth);

    await this.api.editMessageReplyMarkup(process.env.TG_OWNER!, messageId, {
      reply_markup: new InlineKeyboard()
        .text("Today", `set_date:${messageId}:${taskId}:${today}`)
        .text("Tomorrow", `set_date:${messageId}:${taskId}:${tomorrow}`)
        .row()
        .text("Next week", `set_date:${messageId}:${taskId}:${nextWeek}`)
        .text("Next month", `set_date:${messageId}:${taskId}:${nextMonth}`)
        .row(),
    });
  }

  private async renderTaskMessage(task: ITask): Promise<string> {
    let message = `${task.icon} *${task.name}*`;
    let taskContent = await getPage(task.id);
    if (taskContent === "") taskContent = `[Add content](${task.url})`;
    message += `\n\n${taskContent}`;
    if (task.date) message += `\n\nDate: ${task.date.toDateString()}`;

    return message;
  }

  private renderTaskKeyboard(task: ITask, messageId: number) {
    return new InlineKeyboard()
      .url("Go to task", task.url)
      .text("Reschedule", `schedule:${task.id}:${messageId}`)
      .row();
  }

  private async sendTask(task: ITask) {
    const message = await this.renderTaskMessage(task);
    const messageId = await this.message(message);
    await this.api.editMessageReplyMarkup(process.env.TG_OWNER!, messageId, {
      reply_markup: this.renderTaskKeyboard(task, messageId),
    });
  }

  async message(
    text: string,
    keyboard: InlineKeyboard | Keyboard | undefined = undefined
  ): Promise<number> {
    return (
      await this.api.sendMessage(process.env.TG_OWNER!.toString(), text, {
        disable_web_page_preview: true,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      })
    ).message_id;
  }
}

export const bot = new Bot(process.env.TG_BOT_TOKEN);
