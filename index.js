// Imported files
const axios = require("axios");
const { Telegraf, Markup } = require("telegraf");
const https = require("https");
require("dotenv").config();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const agent = new https.Agent({ rejectUnauthorized: false });

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: { agent },
});

// Store user session data
const userSession = {};

// Start the bot and show the main menu
bot.start((ctx) => {
  ctx.reply(
    "👋 Welcome to the Job Bot! Let’s find your dream job.",
    Markup.inlineKeyboard([
      Markup.button.callback("Search Jobs", "start_search"),
    ])
  );
});

// Start search process
bot.action("start_search", (ctx) => {
  const userId = ctx.from.id;
  userSession[userId] = {}; // Initialize session for the user

  ctx.reply(
    "💡 Select a job title:",
    Markup.inlineKeyboard([
      [Markup.button.callback("Developer", "job_developer")],
      [Markup.button.callback("Designer", "job_designer")],
      [Markup.button.callback("Manager", "job_manager")],
    ])
  );
});

// Handle job title selection
bot.action(/job_(.+)/, (ctx) => {
  const userId = ctx.from.id;
  const selectedJob = ctx.match[1];
  console.log(selectedJob);

  userSession[userId].keyword = selectedJob;
  ctx.reply(
    `📍 Where should the job be located?`,
    Markup.inlineKeyboard([
      [Markup.button.callback("Remote", "location_remote")],
      [Markup.button.callback("New York", "location_ny")],
      [Markup.button.callback("San Francisco", "location_sf")],
    ])
  );
});

// Handle location selection
bot.action(/location_(.+)/, (ctx) => {
  const userId = ctx.from.id;
  const selectedLocation = ctx.match[1];

  userSession[userId].location = selectedLocation;
  ctx.reply(
    `🧑‍💻 What experience level?`,
    Markup.inlineKeyboard([
      [Markup.button.callback("Entry Level", "experience_entry")],
      [Markup.button.callback("Mid Level", "experience_mid")],
      [Markup.button.callback("Senior Level", "experience_senior")],
    ])
  );
});

// Handle experience level selection and fetch jobs
bot.action(/experience_(.+)/, async (ctx) => {
  const userId = ctx.from.id;
  const experienceLevel = ctx.match[1].replace("_", "-");

  userSession[userId].experienceLevel = experienceLevel;

  ctx.reply("🔍 Searching for jobs...");
  await fetchJobs(ctx, userSession[userId]);
});

// Fetch jobs from the API
async function fetchJobs(ctx, userData) {
  const params = {
    query: `${userData.keyword} jobs in india`,
    page: "1",
    num_pages: "2",
    date_posted: "today",
    country: "india",
    language: "en",
  };

  const headers = {
    "X-RapidAPI-Key": process.env.API_KEY,
    "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
  };

  try {
    const response = await axios.get(process.env.API_URL, {
      headers,
      params,
      httpsAgent,
    });
  
    const jobs = response.data.data; // Accessing the 'data' array from the response
  
    if (jobs && jobs.length > 0) {
      let jobList = "Here are the top jobs I found for you:\n\n";
  
      jobs.forEach((job, index) => {
        jobList += `${index + 1}. *${job.job_title}* at _${job.employer_name || "Unknown Company"}_\n`;
        jobList += `📍 Location: ${job.job_location || "Not specified"}\n`;
        jobList += `💼 Employment Type: ${job.job_employment_type || "Not specified"}\n`;
        jobList += `🔗 [Apply here](${job.job_apply_link || "No link provided"})\n\n`;
      });
  
      // Sending the formatted job list as a Markdown message
      ctx.replyWithMarkdown(jobList);
    } else {
      ctx.reply("❌ No jobs found matching your criteria. Please try again.");
    }
  } catch (err) {
    console.error("Error fetching jobs:", err);
    ctx.reply(
      "❌ There was an error fetching job listings. Please try again later."
    );
  }
  
}

// Launch the bot
bot.launch();
