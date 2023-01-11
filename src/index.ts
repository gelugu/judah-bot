require("dotenv").config();
import { bot } from "./bot";
import { log } from "./log";

bot.start();
log.info("Started");
bot.message("I started!", bot.mainKeyboard);
