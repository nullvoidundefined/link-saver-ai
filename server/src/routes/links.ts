import express from "express";

import * as linkTagsHandlers from "app/handlers/links/link-tags.js";
import * as linksHandlers from "app/handlers/links/links.js";
import { streamLinkSummary } from "app/handlers/links/summary.js";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";
import { summarizeRateLimit } from "app/middleware/summarizeRateLimit/summarizeRateLimit.js";

const linksRouter = express.Router();

linksRouter.use(requireAuth);

linksRouter.post("/", linksHandlers.create);
linksRouter.get("/", linksHandlers.list);
linksRouter.get("/:id", linksHandlers.getById);
linksRouter.patch("/:id", linksHandlers.update);
linksRouter.delete("/:id", linksHandlers.remove);
linksRouter.get("/:id/summary", summarizeRateLimit, streamLinkSummary);

linksRouter.post("/:id/tags", linkTagsHandlers.addTag);
linksRouter.get("/:id/tags", linkTagsHandlers.listTags);
linksRouter.delete("/:id/tags/:tagId", linkTagsHandlers.removeTag);

export { linksRouter };
