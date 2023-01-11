export interface ITask {
  id: string;
  name: any;
  icon: string;
  status: "Not started" | "In progress" | "Done";
  date: Date | undefined;
  createdTime: Date;
  tags: string[];
  url: string;
}
