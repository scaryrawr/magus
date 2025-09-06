import type { Hono } from "hono";
import type { ObservableServerState } from "../ObservableServerState";

export type RouterFactory<THono extends Hono = Hono> = (state: ObservableServerState) => THono;
