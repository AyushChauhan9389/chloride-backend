
import { Router } from 'express';
import { urlController } from '../controllers/url.controller';

const urlRoutes = Router();

urlRoutes.get('/:shortCode', urlController.redirect);

export default urlRoutes;
