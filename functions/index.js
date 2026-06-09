const { onValueCreated } = require("firebase-functions/v2/database");
const logger = require("firebase-functions/logger");

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

exports.forwardDiscordUpdate = onValueCreated("/discord-events/{eventId}", async (event) => {
  if (!webhookUrl) {
    logger.warn("DISCORD_WEBHOOK_URL is not set.");
    return;
  }

  const data = event.data.val() || {};
  const content = String(data.content || "").slice(0, 1900);

  if (!content) {
    logger.warn("Discord event had no content.", { eventId: event.params.eventId });
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed with status ${response.status}`);
  }
});
