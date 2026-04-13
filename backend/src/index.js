// src/index.js — single entry point, imports all functions so v4 worker registers them
require("../functions/authGoogle/index");
require("../functions/authCallback/index");
require("../functions/register/index");
require("../functions/login/index");
require("../functions/logout/index");
require("../functions/getChartData/index");
require("../functions/getRecipes/index");
require("../functions/blobTrigger/index");