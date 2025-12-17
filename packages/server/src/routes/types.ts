import type { Elysia } from "elysia";
import type { ObservableServerState } from "../ObservableServerState";

export type RouterFactory<TElysia extends Elysia = Elysia> = (state: ObservableServerState) => TElysia;
