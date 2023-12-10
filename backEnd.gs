// doGet function is the entry point for the web app, the function that is executed when the app url is reached
function doGet(e) {
  // Get the URL of the deployed web app
  let appUrl = ScriptApp.getService().getUrl();
  
  // Fetch projects from Notion
  let projects = notionGetProjects();
  
  // Get current timestamp in ISO format with UTC offset
  let timeStamp = toIsoUTCOffsetString(new Date());

  // Initialize project parameter to null
  let projParam = null;

  // Try to extract project ID from the query parameters
  try {
    let urlProjParam = e.parameter.projId;
    let projectNames = projects.map(x => x["name"]);

    // Check if the extracted project ID is valid
    if (projectNames.includes(urlProjParam)){
      projParam = urlProjParam;
    }
  }
  catch { /* Handle potential errors silently */ }

  // Determine if a new recording should be started
  let startNewRecording = projParam != null;

  // Load HTML templates
  let timerTemplate = HtmlService.createHtmlOutputFromFile("timerTemplate").getContent();
  let pageTemplate = HtmlService.createHtmlOutputFromFile("projectList").getContent();
  let rowTemplate = HtmlService.createHtmlOutputFromFile("listRowTemplate").getContent();
  let frontEndJS = HtmlService.createHtmlOutputFromFile("frontEndJS").getContent();

  // Get the current state from the register
  let status = getStateRegister()["status"];

  // Timer value variable initiated
  let compiledTimer = "";

  // If starting a new recording and the timer is not active
  if (startNewRecording && !Boolean(status["timerActive"])) {
    compiledTimer = timerTemplate
      .replaceAll("##PROJNAME##", projParam)
      .replaceAll("##STARTED##", timeStamp)
      .replaceAll("##DESCRIPTION##", "---");
    setStateRegister(true, projParam, "---", timeStamp);
  }

  // If starting a new recording, the timer is active, and it's the same project
  if (startNewRecording && Boolean(status["timerActive"]) && (projParam == status["projectId"])) {
    compiledTimer = timerTemplate
      .replaceAll("##PROJNAME##", projParam)
      .replaceAll("##STARTED##", status["start"])
      .replaceAll("##DESCRIPTION##", status["description"]);
  }

  // If starting a new recording, the timer is active, and it's a different project
  if (startNewRecording && Boolean(status["timerActive"]) && !(projParam == status["projectId"])) {
    compiledTimer = timerTemplate
      .replaceAll("##PROJNAME##", projParam)
      .replaceAll("##STARTED##", status["start"])
      .replaceAll("##DESCRIPTION##", "---");
    // Post the time record to Notion
    notionPostTimeRecord(status["notionPageId"], status["description"], status["start"], timeStamp);
    setStateRegister(true, projParam, "---", timeStamp);
  }

  // If not starting a new recording and the timer is active
  if (!startNewRecording && Boolean(status["timerActive"])) {
    compiledTimer = timerTemplate
      .replaceAll("##PROJNAME##", status["projectId"])
      .replaceAll("##STARTED##", status["start"])
      .replaceAll("##DESCRIPTION##", status["description"]);
  }

  // If not starting a new recording and the timer is not active
  if (!startNewRecording && !Boolean(status["timerActive"])) {
    compiledTimer = timerTemplate
      .replaceAll("##PROJNAME##", "---")
      .replaceAll("##STARTED##", "---")
      .replaceAll("##DESCRIPTION##", "---");
  }

  // Update the status after possible changes
  status = getStateRegister()["status"];

  // Compile the frontend JavaScript
  let compiledFrontEndJS = frontEndJS.replaceAll("##GLOBALPAR##", JSON.stringify({ "activeProjStart": status["start"], "activeProj": status["projectId"], "appUrl":appUrl}));

  // Generate HTML rows for the project list
  let htmlRows = [];
  for (let i = 0; i < projects.length; i++) {
    let currProj =  projects[i]["name"];
    let currentRow = rowTemplate
      .replaceAll("##PROJNAME##", currProj)
      .replaceAll("##PROJDIRECTLINK##", appUrl+"?projId="+currProj);
    htmlRows.push(currentRow);
  }

  // Concatenate HTML rows into a final string
  let finalRowsHtml = ['<div class="list-group">', htmlRows, '</div>'].flat().join("\n");

  // Replace placeholders in the page template with compiled content
  let finalPageHtml = pageTemplate
    .replaceAll("##PROJLIST##", finalRowsHtml)
    .replaceAll("##TIMER##", compiledTimer)
    .replaceAll("##FRONTENDJS##", compiledFrontEndJS);

  // Create HTML output for the web app
  let page = HtmlService.createHtmlOutput();
  page.setContent(finalPageHtml);

  // Return the HTML page
  return page;
}
