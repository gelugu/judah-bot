class Logger {
  private getDate() {
    const date = new Date();
    const dateString = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDay() + 1}`;
    const timeString = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    return `${dateString} ${timeString}`
  }
  private print(type: string, text: string) {
    return `${type} ${this.getDate()} ${text}`;
  }
  info(text: string) {
    console.log(this.print("INFO", text))
  }
  warning(text: string) {
    console.warn(this.print("WARNING", text))
  }
  error(text: string) {
    console.error(this.print("ERROR", text))
  }
}

export const log = new Logger();
