import express from "express";

import * as linksHandlers from "app/handlers/links/links.js";
import { streamLinkSummary } from "app/handlers/links/summary.js";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";

const linksRouter = express.Router();

linksRouter.use(requireAuth);

linksRouter.post("/", linksHandlers.create);
linksRouter.get("/", linksHandlers.list);
linksRouter.get("/:id", linksHandlers.getById);
linksRouter.get("/:id/summary", streamLinkSummary);

export { linksRouter };
