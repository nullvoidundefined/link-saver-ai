import express from "express";

import * as linksHandlers from "app/handlers/links/links.js";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";

const linksRouter = express.Router();

linksRouter.use(requireAuth);

linksRouter.post("/", linksHandlers.create);
linksRouter.get("/", linksHandlers.list);
linksRouter.get("/:id", linksHandlers.getById);

export { linksRouter };
