import * as tagsHandlers from 'app/handlers/tags/tags.js';
import { requireAuth } from 'app/middleware/requireAuth/requireAuth.js';
import express from 'express';

const tagsRouter = express.Router();

tagsRouter.use(requireAuth);

tagsRouter.post('/', tagsHandlers.create);
tagsRouter.get('/', tagsHandlers.list);
tagsRouter.get('/:id', tagsHandlers.getById);
tagsRouter.patch('/:id', tagsHandlers.update);
tagsRouter.delete('/:id', tagsHandlers.remove);

export { tagsRouter };
