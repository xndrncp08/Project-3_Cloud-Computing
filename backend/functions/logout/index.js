// functions/logout/index.js
// POST /api/auth/logout
// JWTs are stateless — actual logout is handled client-side by deleting the token.
// This endpoint exists so the frontend has a clean POST to call.
const { withCors, jsonResponse } = require("../../shared/auth");

module.exports = withCors(async function (context, req) {
  return jsonResponse(context, req, 200, { message: "Logged out successfully" });
});
