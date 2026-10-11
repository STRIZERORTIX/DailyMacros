import { isValidObjectId } from "mongoose";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function objectId(value: string): string {
  if (!isValidObjectId(value)) throw new HttpError(400, "Invalid id");
  return value;
}
