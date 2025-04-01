import { Router } from "express";

import { healthchecker } from "../controllers/healthcheck.controllers.js";

const router = Router();

router.route("/").get(healthchecker);

export default router;
